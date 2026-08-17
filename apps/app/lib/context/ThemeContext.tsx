import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import {
	getThemePreference,
	saveThemePreference,
	type TThemePreference,
} from "@/lib/storage/themePreference";

interface IFThemeContextValue {
	/** 사용자가 설정 화면에서 고른 테마 */
	themePreference: TThemePreference;
	/** 실제로 적용 중인 색상 스킴이 다크인지 여부 */
	isDark: boolean;
	/** 테마를 즉시 적용하고 기기에 저장한다 */
	setThemePreference: (preference: TThemePreference) => void;
}

const ThemeContext = createContext<IFThemeContextValue | null>(null);

/**
 * 저장된 테마 설정을 Appearance에 적용한다.
 * @description NativeWind v4의 `dark:` 클래스와 react-native의 useColorScheme이
 * 모두 Appearance를 따르므로, setColorScheme만 호출하면 앱 전체 테마가 바뀐다.
 * system은 null을 넘겨 기기 설정 추종으로 되돌린다.
 */
function applyColorScheme(preference: TThemePreference) {
	Appearance.setColorScheme(preference === "system" ? null : preference);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [themePreference, setThemePreferenceState] =
		useState<TThemePreference>("system");
	const colorScheme = useColorScheme();

	useEffect(() => {
		getThemePreference().then((preference) => {
			setThemePreferenceState(preference);
			applyColorScheme(preference);
		});
	}, []);

	const setThemePreference = useCallback((preference: TThemePreference) => {
		setThemePreferenceState(preference);
		applyColorScheme(preference);
		saveThemePreference(preference);
	}, []);

	return (
		<ThemeContext.Provider
			value={{
				themePreference,
				isDark: colorScheme === "dark",
				setThemePreference,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}

/** 현재 테마 설정과 변경 함수를 반환한다 */
export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}

	return context;
}
