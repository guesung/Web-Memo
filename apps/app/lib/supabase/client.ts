import { createClient } from "@supabase/supabase-js";
import type { Database } from "@web-memo/shared/types";
import { MemoService } from "@web-memo/shared/utils/services";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { CONFIG } from "@/lib/config";

const ExpoSecureStoreAdapter = {
	getItem: async (key: string): Promise<string | null> => {
		if (Platform.OS === "web") {
			return localStorage.getItem(key);
		}
		return SecureStore.getItemAsync(key);
	},
	setItem: async (key: string, value: string): Promise<void> => {
		if (Platform.OS === "web") {
			localStorage.setItem(key, value);
			return;
		}
		await SecureStore.setItemAsync(key, value);
	},
	removeItem: async (key: string): Promise<void> => {
		if (Platform.OS === "web") {
			localStorage.removeItem(key);
			return;
		}
		await SecureStore.deleteItemAsync(key);
	},
};

export const supabase = createClient<Database, "memo">(
	CONFIG.supabaseUrl,
	CONFIG.supabaseAnonKey,
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
