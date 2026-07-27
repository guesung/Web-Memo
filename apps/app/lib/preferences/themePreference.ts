import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_PREFERENCE_KEY = "webmemo:theme-preference";

export type ThemePreference = "system" | "light" | "dark";

export async function getThemePreference(): Promise<ThemePreference | null> {
	try {
		const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
		return value === "light" || value === "dark" || value === "system"
			? value
			: null;
	} catch {
		return null;
	}
}

export async function saveThemePreference(
	preference: ThemePreference,
): Promise<void> {
	try {
		await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
	} catch {}
}
