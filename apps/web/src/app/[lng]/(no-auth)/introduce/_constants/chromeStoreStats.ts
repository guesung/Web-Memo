// Chrome 웹스토어 기준 통계 (하드코딩)
//
// JSON-LD의 aggregateRating과 Hero 신뢰 배지가 같은 값을 써야 한다. 구조화 데이터는
// 페이지에 실제로 보이는 값을 설명해야 하고, 어긋나면 리치 결과에서 빠지거나 수동
// 조치 대상이 된다. 값을 고칠 때는 여기 한 곳만 고친다.
export const CHROME_STORE_STATS = {
	userCount: 500,
	rating: 4.8,
	reviewCount: 33,
};
