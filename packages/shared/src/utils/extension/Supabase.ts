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

/**
 * 확장 프로그램 컨텍스트에서 재사용하는 메모 스키마 클라이언트.
 * @description 호출마다 새로 만들면 인스턴스마다 자동 갱신 타이머가 하나씩 붙고, 여러 인스턴스가
 * 같은 리프레시 토큰을 각자 회전시켜 auth.refresh_tokens가 불어난다. MV3 서비스 워커는 유휴 시
 * 종료되므로 이 변수도 함께 사라져 고아 인스턴스가 남지 않는다.
 */
let memoSupabaseClient: ReturnType<typeof createMemoSupabaseClient> | null =
	null;

/** 피드백 스키마 클라이언트. 인증을 쓰지 않지만 같은 이유로 인스턴스를 재사용한다. */
let feedbackSupabaseClient: ReturnType<
	typeof createFeedbackSupabaseClient
> | null = null;

/**
 * 로그인된 메모 스키마 Supabase 클라이언트를 반환한다.
 * @description 인스턴스는 재사용하되 **세션 확인은 매 호출 수행한다**. 웹에서 로그인한 세션을
 * 확장이 이어받는 경로가 이 분기이므로, 인스턴스를 캐시했다고 건너뛰면 "웹에서 로그인하면
 * 확장도 로그인" 동작이 깨진다. 세션이 없으면 웹 쿠키에서 토큰을 가져와 심는다.
 *
 * 확인에 AuthService.checkUserLogin(내부적으로 auth.getUser)을 쓰지 않는 이유는, 그것이 매번
 * 서버를 치기 때문이다. 여기는 페이지 방문마다 불리는 경로라 그 왕복이 토큰 갱신 폭주의 주된
 * 출처였다. auth.getSession은 로컬 저장소를 읽고 만료됐을 때만 갱신한다. checkUserLogin은
 * Next.js 미들웨어도 함께 쓰는데 서버에서는 서명 검증이 필요하므로 그쪽은 건드리지 않는다.
 * @throws 웹에도 세션이 없으면 로그인 안내 에러
 */
export const getSupabaseClient = async () => {
	try {
		if (!memoSupabaseClient) {
			memoSupabaseClient = createMemoSupabaseClient();
		}

		const {
			data: { session },
		} = await memoSupabaseClient.auth.getSession();
		if (session) return memoSupabaseClient;

		const accessTokenFromWeb = await chrome.cookies.get({
			name: SUPABASE.authCookie.accessToken,
			url: CONFIG.webUrl,
		});
		const refreshTokenCookieFromWeb = await chrome.cookies.get({
			name: SUPABASE.authCookie.refreshToken,
			url: CONFIG.webUrl,
		});

		if (!accessTokenFromWeb || !refreshTokenCookieFromWeb) {
			throw new Error("로그인을 먼저 해주세요.");
		}

		await memoSupabaseClient.auth.setSession({
			access_token: accessTokenFromWeb.value,
			refresh_token: refreshTokenCookieFromWeb.value,
		});

		return memoSupabaseClient;
	} catch {
		throw new Error("로그인을 먼저 해주세요");
	}
};

/** 피드백 스키마 Supabase 클라이언트를 반환한다. 인증이 필요 없다. */
export const getFeedbackSupabaseClient = () => {
	if (!feedbackSupabaseClient) {
		feedbackSupabaseClient = createFeedbackSupabaseClient();
	}

	return feedbackSupabaseClient;
};
