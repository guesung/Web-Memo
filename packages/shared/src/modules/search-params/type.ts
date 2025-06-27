import type { SEARCH_PARAMS_KEYS } from "./constant";

export type SearchParamViewType = "grid" | "calendar";
export type SearchParamKeyType = (typeof SEARCH_PARAMS_KEYS)[number];
export type SearchParamValueType = string;
export type SearchParamType = [SearchParamKeyType, SearchParamValueType];
export type SearchParamsType = {
	[K in SearchParamKeyType]: K extends "view" ? SearchParamViewType : string;
};
