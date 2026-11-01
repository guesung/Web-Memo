import { isFeedBlog } from "@web-memo/shared/constants";
import type {
	IFBlogReadingSummarySource,
	IFBlogSourceStatus,
	TBlogId,
} from "@web-memo/shared/types";

/** 피드 소스(긱뉴스)의 수집·안 읽은 글 집계. */
export interface IFBlogFeedTotals {
	blogId: TBlogId;
	/** 지금까지 수집한 글 수 */
	collectedCount: number;
	/** 수집한 글 중 메모 완료가 아닌 글 수 */
	unreadCount: number;
}

/** 현재 목록 범위(전체 또는 한 블로그)의 수집·메모 완료 집계. */
export interface IFBlogScopeTotals {
	/** 전체 수집형(archive) 소스가 지금까지 수집한 글 수 */
	collectedCount: number;
	/** 범위의 모든 archive 소스가 전체 수집을 마친 경우에만 확정 총 글 수, 아니면 null */
	total: number | null;
	/** archive 소스에서 메모 완료한 고유 글 수 */
	completedCount: number;
	/** 범위에 archive 소스가 있는지 */
	hasArchiveSource: boolean;
	/** 범위에 피드 소스가 있으면 그 집계, 없으면 null */
	feed: IFBlogFeedTotals | null;
	/** 가장 최근 성공 수집 시각 */
	lastSuccessAt: string | null;
}

/**
 * 목록 범위의 소스들을 합쳐 요약 문구에 쓸 수를 계산한다.
 * @description 확정 총 글 수는 archive 소스가 모두 `total`을 가질 때만 돌려준다. 수집 중인 소스가 하나라도 있으면 null이다.
 * 피드 소스는 총 글 수가 없으므로 archive 집계에서 빼고 `feed`로 따로 합친다.
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
	const archivePageSources = pageSources.filter(
		(source) => !isFeedBlog(source.blogId),
	);
	const feedPageSources = pageSources.filter((source) =>
		isFeedBlog(source.blogId),
	);
	const archiveSummary = scopedSummary.filter(
		(source) => !isFeedBlog(source.blogId),
	);
	const feedSummary = scopedSummary.filter((source) =>
		isFeedBlog(source.blogId),
	);
	const isEveryTotalKnown =
		archivePageSources.length > 0 &&
		archivePageSources.every((source) => source.total !== null);
	const lastSuccessTimes = pageSources
		.map((source) => source.lastSuccessAt)
		.filter((time): time is string => time !== null)
		.sort();
	const feedCollectedCount = feedPageSources.reduce(
		(sum, source) => sum + source.collectedCount,
		0,
	);
	const feedCompletedCount = feedSummary.reduce(
		(sum, source) => sum + source.completedCount,
		0,
	);

	return {
		collectedCount: archivePageSources.reduce(
			(sum, source) => sum + source.collectedCount,
			0,
		),
		total: isEveryTotalKnown
			? archivePageSources.reduce((sum, source) => sum + (source.total ?? 0), 0)
			: null,
		completedCount: archiveSummary.reduce(
			(sum, source) => sum + source.completedCount,
			0,
		),
		hasArchiveSource: archivePageSources.length > 0,
		feed: feedPageSources[0]
			? {
					blogId: feedPageSources[0].blogId,
					collectedCount: feedCollectedCount,
					unreadCount: feedCollectedCount - feedCompletedCount,
				}
			: null,
		lastSuccessAt: lastSuccessTimes.at(-1) ?? null,
	};
};
