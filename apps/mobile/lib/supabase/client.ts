import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/constants/config";

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		storage: ExpoSecureStoreAdapter,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
