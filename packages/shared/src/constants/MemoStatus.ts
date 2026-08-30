/**
 * 메모에 붙일 수 있는 상태 3종. 목록 필터와 토글 UI의 표시 순서도 이 순서를 따른다.
 * @description 사이드패널·웹·네이티브 앱이 공유하는 단일 출처다. 상태를 늘리려면 여기만 고치고,
 * 각 표면의 `Record<TMemoStatusKey, ...>` 맵이 컴파일 에러로 빠진 곳을 짚어준다.
 */
export const MEMO_STATUS_KEYS = ["isWish", "isStar", "isReading"] as const;

/**
 * 메모 상태 키. DB `memo` 테이블의 boolean 컬럼명이자 메모 목록의 검색 파라미터 이름과 같다.
 */
export type TMemoStatusKey = (typeof MEMO_STATUS_KEYS)[number];
