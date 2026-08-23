import type { Category } from "@web-memo/shared/modules/extension-bridge";

export const DEFAULT_LANGUAGE = "ko";
export const DEFAULT_CATEGORY: Category = "others";

/**
 * 프롬프트에 박아 넣을 언어명.
 * @description 요약 기능은 ko/en만 지원하므로 그 둘만 둔다.
 */
export const LANGUAGE_NAME = {
	ko: "Korean",
	en: "English",
} as const;
