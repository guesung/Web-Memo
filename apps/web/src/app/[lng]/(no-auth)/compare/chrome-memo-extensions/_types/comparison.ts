/** 표 셀 하나의 지원 정도. 로그인 행에서는 "로그인 없이 쓸 수 있는 범위"를 뜻한다 */
export type TSupportStatus =
	| "supported"
	| "partial"
	| "unsupported"
	| "unknown";

/** 비교 대상 제품 식별자 */
export type TCompareProductKey =
	| "webMemo"
	| "notionWebClipper"
	| "liner"
	| "glasp"
	| "googleKeep";

/** 비교 대상 제품 하나 */
export interface IFCompareProduct {
	key: TCompareProductKey;
	name: string;
	/** "한눈에 보기"에 쓰는 한 줄 정체 */
	identity: string;
	/** 공식 링크와 근거 페이지. 첫 항목이 대표 링크다 */
	sources: IFCompareSource[];
}

/** 근거로 삼은 공식 페이지 링크 */
export interface IFCompareSource {
	label: string;
	url: string;
}

/** 표의 셀 하나 */
export interface IFCompareCell {
	status: TSupportStatus;
	description: string;
}

/** 표의 행 하나. 모든 제품의 셀을 빠짐없이 가져야 한다 */
export interface IFCompareCriterion {
	key: string;
	label: string;
	cells: Record<TCompareProductKey, IFCompareCell>;
}

/** 상황별 추천 항목 */
export interface IFCompareRecommendation {
	situation: string;
	productName: string;
	note?: string;
}
