import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { SUPABASE } from "../../constants";
import type { StorageKeyType } from "../../modules/chrome-storage";
import { ChromeSyncStorage } from "../../modules/chrome-storage";
import type { Database } from "../../types";

const createMemoSupabaseClient = () =>
	createClient<Database, "memo">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.memo },
		auth: {
			storage: {
				getItem: async (key) => {
					return (await ChromeSyncStorage.get(key as StorageKeyType)) ?? null;
				},
				setItem: async (key, value) => {
					return await ChromeSyncStorage.set(key as StorageKeyType, value);
				},
				removeItem: async (key) => {
					return await ChromeSyncStorage.remove(key as StorageKeyType);
				},
			},
		},
	});

const createFeedbackSupabaseClient = () =>
	createClient<Database, "feedback">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.feedback },
	});

const createPublicMemoSupabaseClient = () =>
	createClient<Database, "memo">(SUPABASE.url, SUPABASE.anonKey, {
		db: { schema: SUPABASE.schema.memo },
		auth: { persistSession: false, autoRefreshToken: false },
	});

let publicMemoSupabaseClient: ReturnType<
	typeof createPublicMemoSupabaseClient
> | null = null;

let memoSupabaseClient: ReturnType<typeof createMemoSupabaseClient> | null =
	null;

let feedbackSupabaseClient: ReturnType<
	typeof createFeedbackSupabaseClient
> | null = null;

/** 로그인 쿠키와 저장 세션이 모두 없는 경우. 다른 인증 장애와 구분한다. */
export class SupabaseSessionRequiredError extends Error {}

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
			throw sessionError;
		}
		if (session) {
			return memoSupabaseClient;
		}

		const accessTokenFromWeb = await chrome.cookies.get({
			name: SUPABASE.authCookie.accessToken,
			url: CONFIG.webUrl,
		});
		const refreshTokenCookieFromWeb = await chrome.cookies.get({
			name: SUPABASE.authCookie.refreshToken,
			url: CONFIG.webUrl,
		});

		if (!accessTokenFromWeb || !refreshTokenCookieFromWeb) {
			throw new SupabaseSessionRequiredError("로그인을 먼저 해주세요");
		}

		const { error: restoreError } = await memoSupabaseClient.auth.setSession({
			access_token: accessTokenFromWeb.value,
			refresh_token: refreshTokenCookieFromWeb.value,
		});
		if (restoreError) {
			throw restoreError;
		}

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
