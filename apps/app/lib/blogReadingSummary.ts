import type { IFBlogReadingSummarySource } from "@web-memo/shared/types/blog-reading";

/** 구독 소스 여러 개를 합친 진행 수치 */
export interface IFBlogSummaryTotals {
	/** 현재 확보한 글 수 */
	collectedCount: number;
	/** 유효 메모가 있는 고유 글 수 */
	completedCount: number;
	/** 모든 소스의 총 글 수가 확정된 경우의 합계. 하나라도 수집 중이면 null */
	confirmedTotal: number | null;
}

/**
 * 구독 소스들의 수집 글 수·메모 완료 수를 합친다.
 * @description 총 글 수는 모든 소스가 전체 수집을 마쳐 서버가 `total`을 내려 준 경우에만 값이 있다.
 * 수집 중인 소스가 하나라도 있으면 분모를 추정하지 않고 null로 둔다.
 * 사용처: 메모 홈 진입 카드, 블로그 정주행 화면 요약.
 */
export function getBlogSummaryTotals(
	sources: readonly Pick<
		IFBlogReadingSummarySource,
		"collectedCount" | "completedCount" | "total"
	>[],
): IFBlogSummaryTotals {
	const isTotalConfirmed =
		sources.length > 0 && sources.every((source) => source.total !== null);

	return {
		collectedCount: sources.reduce((sum, s) => sum + s.collectedCount, 0),
		completedCount: sources.reduce((sum, s) => sum + s.completedCount, 0),
		confirmedTotal: isTotalConfirmed
			? sources.reduce((sum, s) => sum + (s.total ?? 0), 0)
			: null,
	};
}
