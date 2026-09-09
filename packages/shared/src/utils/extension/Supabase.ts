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

let memoSupabaseClient: ReturnType<typeof createMemoSupabaseClient> | null =
	null;

let feedbackSupabaseClient: ReturnType<
	typeof createFeedbackSupabaseClient
> | null = null;

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

export const getFeedbackSupabaseClient = () => {
	if (!feedbackSupabaseClient) {
		feedbackSupabaseClient = createFeedbackSupabaseClient();
	}

	return feedbackSupabaseClient;
};
