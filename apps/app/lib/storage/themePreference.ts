import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_PREFERENCE_KEY = "webmemo:theme-preference";

/** 사용자가 고른 화면 테마. system은 기기 설정을 그대로 따른다 */
export type TThemePreference = "system" | "light" | "dark";

const THEME_PREFERENCES: TThemePreference[] = ["system", "light", "dark"];

/** 저장된 테마 설정을 반환한다. 값이 없거나 알 수 없는 값이면 system으로 본다 */
export async function getThemePreference(): Promise<TThemePreference> {
	try {
		const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
		if (value && THEME_PREFERENCES.includes(value as TThemePreference)) {
			return value as TThemePreference;
		}

		return "system";
	} catch {
		return "system";
	}
}

/** 테마 설정을 기기에 저장한다 */
export async function saveThemePreference(
	preference: TThemePreference,
): Promise<void> {
	try {
		await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
	} catch {}
}
