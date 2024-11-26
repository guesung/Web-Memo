import { SEARCH_PARAMS_KEYS } from './constant';

export type SearchParamKeyType = (typeof SEARCH_PARAMS_KEYS)[number];
export type SearchParamValueType = string;
export type SearchParamType = [SearchParamKeyType, SearchParamValueType];
