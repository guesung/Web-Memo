import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "@web-memo/env";
import { COOKIE_KEY, SUPABASE } from "../../constants";
import type { Database } from "../../types";

import { AuthService } from "../Supabase";

/**
 * Supabase 세션 보관용 스토리지 어댑터.
 * @description 인증 토큰은 구글 계정으로 복제되는 sync 대신 이 기기에만 남는 local에 보관한다.
 * sync는 항목당 8KB 제한이 있어 세션 JSON 저장에도 부적합하다.
 * 이전 버전이 sync에 저장한 세션은 최초 접근 시 local로 옮겨 로그인 상태를 유지한다.
 */
const supabaseAuthStorage = {
	getItem: async (key: string): Promise<string | null> => {
		const local = await chrome.storage.local.get(key);
		if (local[key] !== undefined) return local[key];

		const sync = await chrome.storage.sync.get(key);
		if (sync[key] === undefined) return null;

		await chrome.storage.local.set({ [key]: sync[key] });
		await chrome.storage.sync.remove(key);
		return sync[key];
	},
	setItem: async (key: string, value: string) => {
		await chrome.storage.local.set({ [key]: value });
	},
	removeItem: async (key: string) => {
		await Promise.all([
			chrome.storage.local.remove(key),
			chrome.storage.sync.remove(key),
		]);
	},
};

export const getSupabaseClient = async () => {
	try {
		const supabaseClientInstance = createClient<Database, "memo">(
			CONFIG.supabaseUrl,
			CONFIG.supabaseAnonKey,
			{
				db: { schema: SUPABASE.schema.memo },
				auth: {
					storage: supabaseAuthStorage,
				},
			},
		);

		const isUserLogin = await new AuthService(
			supabaseClientInstance,
		).checkUserLogin();
		if (isUserLogin) return supabaseClientInstance;

		const accessTokenFromWeb = await chrome.cookies.get({
			name: COOKIE_KEY.accessToken,
			url: CONFIG.webUrl,
		});
		const refreshTokenCookieFromWeb = await chrome.cookies.get({
			name: COOKIE_KEY.refreshToken,
			url: CONFIG.webUrl,
		});

		if (!accessTokenFromWeb || !refreshTokenCookieFromWeb)
			throw new Error("로그인을 먼저 해주세요.");

		await supabaseClientInstance.auth.setSession({
			access_token: accessTokenFromWeb.value,
			refresh_token: refreshTokenCookieFromWeb.value,
		});

		return supabaseClientInstance;
	} catch (error) {
		// 네트워크 오류·스토리지 실패 같은 원인을 "로그인 필요"로 뭉개면 디버깅이 불가능해진다.
		if (error instanceof Error) throw error;
		throw new Error("로그인을 먼저 해주세요.");
	}
};

/**
 * 웹 API(OpenAI 프록시 등) 호출 시 Authorization 헤더에 담을 액세스 토큰을 돌려준다.
 * @description 로그인돼 있지 않으면 null을 돌려주며, 예외를 던지지 않는다.
 */
export const getSupabaseAccessToken = async (): Promise<string | null> => {
	try {
		const supabaseClient = await getSupabaseClient();
		const { data } = await supabaseClient.auth.getSession();

		return data.session?.access_token ?? null;
	} catch {
		return null;
	}
};

export const getFeedbackSupabaseClient = () => {
	return createClient<Database, "feedback">(
		CONFIG.supabaseUrl,
		CONFIG.supabaseAnonKey,
		{
			db: { schema: SUPABASE.schema.feedback },
		},
	);
};
