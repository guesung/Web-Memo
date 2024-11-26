import { searchParamsKeys } from './constant';

export type SearchParamKeyType = (typeof searchParamsKeys)[number];
export type SearchParamValueType = string;
export type SearchParamType = [SearchParamKeyType, SearchParamValueType];
