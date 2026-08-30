import { MEMO_STATUS_KEYS } from "../../constants/MemoStatus";

/**
 * 메모 목록 URL이 다루는 검색 파라미터 이름.
 * @description 상태 3종은 `MEMO_STATUS_KEYS`에서 그대로 끌어온다. 상태가 늘어도 여기가 따라오지 못해
 * URL에서만 빠지는 일이 없게 하려는 것이다.
 */
export const SEARCH_PARAMS_KEYS = [
	"id",
	...MEMO_STATUS_KEYS,
	"category",
	"view",
	"query",
	"searchTarget",
] as const;
export const SEARCH_TARGET_OPTIONS = ["memo", "category"] as const;
