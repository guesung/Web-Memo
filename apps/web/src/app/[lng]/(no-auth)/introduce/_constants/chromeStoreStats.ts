// Chrome 웹스토어 기준 통계 (하드코딩)
//
// 사용자 수만 남긴다. 평점과 리뷰 수는 화면 배지와 JSON-LD aggregateRating에서 함께
// 걷어냈다 — 화면에 보이지 않는 값을 구조화 데이터로 마크업하면 리치 결과에서
// 빠지거나 수동 조치 대상이 된다. 값을 고칠 때는 여기 한 곳만 고친다.
export const CHROME_STORE_STATS = {
	userCount: 500,
};
