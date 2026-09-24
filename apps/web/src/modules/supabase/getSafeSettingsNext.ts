/** 로그인 후 복귀할 수 있는 공개 설정 경로만 허용합니다. */
export const getSafeSettingsNext = (
	next: string | null | undefined,
): string | null => {
	if (
		next === "/ko/settings" ||
		next === "/en/settings" ||
		next === "/ko/settings#extension" ||
		next === "/en/settings#extension"
	) {
		return next;
	}

	return null;
};
