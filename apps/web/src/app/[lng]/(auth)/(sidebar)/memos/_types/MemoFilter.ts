/**
 * 메모 목록을 어떤 기준으로 거를지. 라우트가 결정한다.
 *
 * @description 예전에는 `?isWish=true` 같은 쿼리 파라미터였는데, 필터가 searchParams에만
 * 있으면 서버 컴포넌트가 지금 어느 탭인지 알 수 없어 사이드바에 활성 표시를 붙일 수 없었다.
 */
export type TMemoFilter = "all" | "wish" | "star" | "reading";
