import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "../../constants";
import type { Database } from "../../types";
import { getWebSessionAccessToken } from "./webSessionCookie";

/**
 * 예전 버전이 세션을 `chrome.storage.sync`에 저장했다. 그 세션은 웹과 같은 refresh token 계열이라
 * 옮기지 않고 지운다. 실패해도 새 세션 발급에는 영향이 없으므로 무시한다.
 */
const removeLegacySyncSession = () => {
	try {
		chrome.storage.sync.remove(SUPABASE.authToken).catch(() => {});
	} catch {
		/** sync 저장소를 쓸 수 없어도 확장 세션 흐름에는 영향이 없다. */
	}
};

/** 세션은 기기마다 따로 발급받으므로 동기화되지 않는 local 저장소에 둔다. */
const extensionSessionStorage = {
	getItem: async (key: string) => {
		const stored = await chrome.storage.local.get(key);
		return (stored[key] as string | undefined) ?? null;
	},
	setItem: async (key: string, value: string) => {
		await chrome.storage.local.set({ [key]: value });
	},
	removeItem: async (key: string) => {
		await chrome.storage.local.remove(key);
	},
};

const createMemoSupabaseClient = () => {
	removeLegacySyncSession();

	return createClient<Database, "memo">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.memo },
		auth: { storage: extensionSessionStorage },
	});
};

const createFeedbackSupabaseClient = () =>
	createClient<Database, "feedback">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.feedback },
	});

const createPublicMemoSupabaseClient = () =>
	createClient<Database, "memo">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.memo },
		/** 로그인 클라이언트와 같은 storageKey를 쓰면 GoTrueClient 중복 경고가 나므로 키를 나눈다. */
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			storageKey: "web-memo-public",
		},
	});

type MemoSupabaseClient = ReturnType<typeof createMemoSupabaseClient>;

let publicMemoSupabaseClient: ReturnType<
	typeof createPublicMemoSupabaseClient
> | null = null;

let memoSupabaseClient: ReturnType<typeof createMemoSupabaseClient> | null =
	null;

let feedbackSupabaseClient: ReturnType<
	typeof createFeedbackSupabaseClient
> | null = null;

/** 저장 세션과 웹 로그인 쿠키가 모두 없거나 인증 서버가 거부한 경우. 다른 인증 장애와 구분한다. */
export class SupabaseSessionRequiredError extends Error {}

/**
 * Supabase 인증 서버가 세션을 거부한 오류인지 판별한다.
 *
 * @description 세션 발급 거부·refresh token 만료 같은 4xx(429 제외) 거부와 세션 부재는
 * 장애가 아니라 로그인 만료 상태다. 네트워크·5xx(`AuthRetryableFetchError` 포함)는 제외한다.
 * `supabase-js` 모듈 의존을 피하려고 name·status로 덕타이핑한다.
 */
const isAuthRejectionError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}
	if (error.name === "AuthSessionMissingError") {
		return true;
	}
	if (error.name !== "AuthApiError") {
		return false;
	}

	const status = (error as { status?: unknown }).status;

	return (
		typeof status === "number" &&
		status >= 400 &&
		status < 500 &&
		status !== 429
	);
};

/**
 * `getSupabaseClient`가 던진 오류가 인증 거부가 아닌 세션 복원 실패인지 판별한다.
 *
 * @description 쿠키가 없는 순수 로그아웃(원인 없는 `SupabaseSessionRequiredError`)과 인증 서버의
 * 거부(원인이 4xx `AuthApiError`·`AuthSessionMissingError`)는 정상 로그아웃 상태다. 원인이 네트워크·5xx·예상 밖
 * 오류면 사용자는 로그인돼 있을 수 있는데 패널이 로그인 화면을 띄운 것이라 보고 대상이다.
 * 두 경우 모두 메시지가 "로그인을 먼저 해주세요"라 `isLoggedOutError`로는 구분되지 않는다.
 */
export const isSessionRestoreFailure = (error: unknown): boolean =>
	error instanceof Error &&
	error.cause !== undefined &&
	!isAuthRejectionError(error.cause);

/** 인증 거부는 로그인 필요 오류로 바꾸고, 그 외는 원본을 그대로 돌려준다. */
const toSessionRequiredError = (error: unknown): unknown => {
	if (isAuthRejectionError(error)) {
		return new SupabaseSessionRequiredError("로그인을 먼저 해주세요", {
			cause: error,
		});
	}

	return error;
};

const EXTENSION_SESSION_LOCK = "web-memo-extension-session";

/** 사이드 패널과 서비스 워커가 동시에 발급하지 않도록 lock 안에서 실행한다. lock을 못 쓰면 그대로 실행한다. */
const withSessionLock = async <T>(task: () => Promise<T>): Promise<T> => {
	if (typeof navigator === "undefined" || !navigator.locks) {
		return task();
	}

	return await navigator.locks.request(EXTENSION_SESSION_LOCK, task);
};

/** 웹 세션 access token으로 `extension-session`을 호출해 일회용 token_hash를 받는다. */
const fetchExtensionSessionTokenHash = async (webAccessToken: string) => {
	const response = await fetch(
		`${SUPABASE.url}/functions/v1/extension-session`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${webAccessToken}`,
				apikey: SUPABASE.anonKey,
			},
		},
	);
	if (response.status === 401 || response.status === 422) {
		throw new SupabaseSessionRequiredError("로그인을 먼저 해주세요");
	}
	if (!response.ok) {
		throw new Error(`extension-session 요청 실패: ${response.status}`);
	}
	const { token_hash: tokenHash } = (await response.json()) as {
		token_hash?: unknown;
	};
	if (typeof tokenHash !== "string") {
		throw new Error("extension-session 응답에 token_hash가 없습니다");
	}

	return tokenHash;
};

/** 웹 세션 access token을 빌려 확장 전용 세션을 발급받는다. 웹과 refresh token을 공유하지 않는다. */
const issueExtensionSession = (client: MemoSupabaseClient) =>
	withSessionLock(async () => {
		const {
			data: { session },
			error: sessionError,
		} = await client.auth.getSession();
		if (sessionError) {
			throw toSessionRequiredError(sessionError);
		}
		if (session) {
			return;
		}

		const webAccessToken = await getWebSessionAccessToken();
		if (!webAccessToken) {
			throw new SupabaseSessionRequiredError("로그인을 먼저 해주세요");
		}

		const tokenHash = await fetchExtensionSessionTokenHash(webAccessToken);
		const { error: verifyError } = await client.auth.verifyOtp({
			token_hash: tokenHash,
			type: "magiclink",
		});
		if (verifyError) {
			throw toSessionRequiredError(verifyError);
		}
	});

/** 확장 세션을 복원하고 안전한 사용자용 오류 메시지와 원인 정보를 유지한다. */
export const getSupabaseClient = async () => {
	try {
		if (!memoSupabaseClient) {
			memoSupabaseClient = createMemoSupabaseClient();
		}

		const {
			data: { session },
			error: sessionError,
		} = await memoSupabaseClient.auth.getSession();
		if (sessionError) {
			throw toSessionRequiredError(sessionError);
		}
		if (session) {
			return memoSupabaseClient;
		}

		await issueExtensionSession(memoSupabaseClient);

		return memoSupabaseClient;
	} catch (error) {
		if (error instanceof SupabaseSessionRequiredError) {
			throw error;
		}
		throw new Error("로그인을 먼저 해주세요", { cause: error });
	}
};

/**
 * 세션 없이 공개 행만 읽는 memo 스키마 클라이언트를 재사용한다.
 * @description 로그인 클라이언트와 저장소를 공유하지 않아 세션을 건드리지 않는다. 공지처럼 anon에게 열린 테이블 전용이다.
 */
export const getPublicMemoSupabaseClient = () => {
	if (!publicMemoSupabaseClient) {
		publicMemoSupabaseClient = createPublicMemoSupabaseClient();
	}

	return publicMemoSupabaseClient;
};

/** 피드백 스키마 전용 클라이언트를 재사용한다. */
export const getFeedbackSupabaseClient = () => {
	if (!feedbackSupabaseClient) {
		feedbackSupabaseClient = createFeedbackSupabaseClient();
	}

	return feedbackSupabaseClient;
};
