import type { SUPPORTED_LANGUAGES } from "./constant";

export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type LanguageType = {
	lng: Language;
};
export interface LanguageParams {
	params: LanguageType;
}
