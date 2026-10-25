import type { SEARCH_PARAMS_KEYS, SEARCH_TARGET_OPTIONS } from "./constant";

export type SearchParamViewType = "grid" | "list";
export type SearchParamSearchTargetType =
	(typeof SEARCH_TARGET_OPTIONS)[number];
export type SearchParamKeyType = (typeof SEARCH_PARAMS_KEYS)[number];
export type SearchParamsType = {
	[K in SearchParamKeyType]: K extends "view"
		? SearchParamViewType
		: K extends "searchTarget"
			? SearchParamSearchTargetType
			: string;
};
export type SearchParamValueType<
	K extends SearchParamKeyType = SearchParamKeyType,
> = SearchParamsType[K];
export type SearchParamType = {
	[K in SearchParamKeyType]: [K, SearchParamValueType<K>];
}[SearchParamKeyType];
