/**
 * i18next 번역 값을 문자열 배열로 안전하게 변환한다.
 * @description 번역 키가 없거나 빈 배열인 경우 i18next는 배열 대신 키 문자열을 반환하므로,
 * 렌더 단계에서 map을 호출하기 전에 배열 여부를 확인해야 한다.
 */
export function toStringArray(translated: unknown): string[] {
	if (!Array.isArray(translated)) {
		return [];
	}

	return translated as string[];
}
