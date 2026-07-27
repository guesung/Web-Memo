import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
	getThemePreference,
	saveThemePreference,
	type ThemePreference,
} from "@/lib/preferences/themePreference";

export function useThemePreference() {
	const { setColorScheme } = useColorScheme();
	const [preference, setPreference] = useState<ThemePreference>("system");

	useEffect(() => {
		getThemePreference().then((saved) => {
			if (saved) {
				setPreference(saved);
				setColorScheme(saved);
			}
		});
	}, [setColorScheme]);

	const updatePreference = (next: ThemePreference) => {
		setPreference(next);
		setColorScheme(next);
		saveThemePreference(next);
	};

	return { preference, setPreference: updatePreference };
}
