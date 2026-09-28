import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "@web-memo/shared/constants";
import type { Database } from "@web-memo/shared/types";
import {
	HighlightService,
	MemoService,
	SettingService,
} from "@web-memo/shared/utils/services";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { IOS_APP_GROUP } from "@/lib/sharing/appGroup";

const ExpoSecureStoreAdapter = {
	getItem: async (key: string): Promise<string | null> => {
		if (Platform.OS === "web") {
			return localStorage.getItem(key);
		}
		if (Platform.OS === "ios") {
			const sharedValue = await SecureStore.getItemAsync(key, {
				accessGroup: IOS_APP_GROUP,
			});
			if (sharedValue !== null) {
				return sharedValue;
			}
			// App Group 도입 전에 저장된 기존 사용자의 세션. 여기서 로그아웃되지 않도록 폴백으로 읽는다.
			return SecureStore.getItemAsync(key);
		}
		return SecureStore.getItemAsync(key);
	},
	setItem: async (key: string, value: string): Promise<void> => {
		if (Platform.OS === "web") {
			localStorage.setItem(key, value);
			return;
		}
		if (Platform.OS === "ios") {
			await SecureStore.setItemAsync(key, value, {
				accessGroup: IOS_APP_GROUP,
			});
			return;
		}
		await SecureStore.setItemAsync(key, value);
	},
	removeItem: async (key: string): Promise<void> => {
		if (Platform.OS === "web") {
			localStorage.removeItem(key);
			return;
		}
		if (Platform.OS === "ios") {
			await Promise.all([
				SecureStore.deleteItemAsync(key, { accessGroup: IOS_APP_GROUP }),
				SecureStore.deleteItemAsync(key),
			]);
			return;
		}
		await SecureStore.deleteItemAsync(key);
	},
};

export const supabase = createClient<Database, "memo">(
	SUPABASE.url,
	SUPABASE.anonKey,
	{
		db: { schema: "memo" },
		auth: {
			storage: ExpoSecureStoreAdapter,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	},
);

export const memoService = new MemoService(supabase);
export const settingService = new SettingService(supabase);
export const highlightService = new HighlightService(supabase);
