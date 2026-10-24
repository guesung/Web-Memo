import type {
	IFBlogReadingSummarySource,
	IFBlogSourceStatus,
	TBlogId,
} from "@web-memo/shared/types";

/** 현재 목록 범위(전체 또는 한 블로그)의 수집·메모 완료 집계. */
export interface IFBlogScopeTotals {
	/** 지금까지 수집한 글 수 */
	collectedCount: number;
	/** 범위의 모든 소스가 전체 수집을 마친 경우에만 확정 총 글 수, 아니면 null */
	total: number | null;
	/** 메모 완료한 고유 글 수 */
	completedCount: number;
	/** 가장 최근 성공 수집 시각 */
	lastSuccessAt: string | null;
}

/**
 * 목록 범위의 소스들을 합쳐 요약 문구에 쓸 수를 계산한다.
 * @description 확정 총 글 수는 모든 소스가 `total`을 가질 때만 돌려준다. 수집 중인 소스가 하나라도 있으면 null이다.
 */
export const getBlogScopeTotals = ({
	pageSources,
	summarySources,
	blogId,
}: {
	pageSources: IFBlogSourceStatus[];
	summarySources: IFBlogReadingSummarySource[];
	blogId: TBlogId | null;
}): IFBlogScopeTotals => {
	const scopedSummary = summarySources.filter(
		(source) => blogId === null || source.blogId === blogId,
	);
	const isEveryTotalKnown =
		pageSources.length > 0 &&
		pageSources.every((source) => source.total !== null);
	const lastSuccessTimes = pageSources
		.map((source) => source.lastSuccessAt)
		.filter((time): time is string => time !== null)
		.sort();

	return {
		collectedCount: pageSources.reduce(
			(sum, source) => sum + source.collectedCount,
			0,
		),
		total: isEveryTotalKnown
			? pageSources.reduce((sum, source) => sum + (source.total ?? 0), 0)
			: null,
		completedCount: scopedSummary.reduce(
			(sum, source) => sum + source.completedCount,
			0,
		),
		lastSuccessAt: lastSuccessTimes.at(-1) ?? null,
	};
};
