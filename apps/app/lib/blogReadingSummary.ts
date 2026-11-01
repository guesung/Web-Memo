import { isFeedBlog } from "@web-memo/shared/constants/blog-catalog";
import type { IFBlogReadingSummarySource } from "@web-memo/shared/types/blog-reading";
import { getBlogDisplayName } from "../components/blog-reading/blogSourceStatusCopy";

type TSummarySource = Pick<
	IFBlogReadingSummarySource,
	"blogId" | "collectedCount" | "completedCount" | "total"
>;

/** 구독 소스 여러 개를 합친 진행 수치 */
export interface IFBlogSummaryTotals {
	/** 전체 수집형(archive) 소스의 현재 확보 글 수 */
	collectedCount: number;
	/** 전체 수집형(archive) 소스에서 유효 메모가 있는 고유 글 수 */
	completedCount: number;
	/** 전체 수집형 소스의 총 글 수가 모두 확정된 경우의 합계. 하나라도 수집 중이거나 전체 수집형 소스가 없으면 null */
	confirmedTotal: number | null;
	/** 전체 수집형 소스를 구독 중인지 */
	hasArchiveSource: boolean;
	/** 피드형 소스 합계. 피드를 구독하지 않으면 null. 안 읽은 글은 수집한 글 중 메모 완료가 아닌 글이다 */
	feed: { collectedCount: number; unreadCount: number } | null;
}

/**
 * 구독 소스들의 수집 글 수·메모 완료 수를 합친다.
 * @description 총 글 수는 전체 수집형 소스가 모두 `total`을 내려 준 경우에만 값이 있다.
 * 피드형 소스는 총 글 수가 없으므로 이 계산에서 빼고 `feed`로 따로 합친다.
 * 사용처: 메모 홈 진입 카드, 블로그 정주행 화면 요약.
 */
export function getBlogSummaryTotals(
	sources: readonly TSummarySource[],
): IFBlogSummaryTotals {
	const archiveSources = sources.filter((source) => !isFeedBlog(source.blogId));
	const feedSources = sources.filter((source) => isFeedBlog(source.blogId));
	const isTotalConfirmed =
		archiveSources.length > 0 &&
		archiveSources.every((source) => source.total !== null);
	const feedCollectedCount = feedSources.reduce(
		(sum, s) => sum + s.collectedCount,
		0,
	);
	const feedCompletedCount = feedSources.reduce(
		(sum, s) => sum + s.completedCount,
		0,
	);

	return {
		collectedCount: archiveSources.reduce(
			(sum, s) => sum + s.collectedCount,
			0,
		),
		completedCount: archiveSources.reduce(
			(sum, s) => sum + s.completedCount,
			0,
		),
		confirmedTotal: isTotalConfirmed
			? archiveSources.reduce((sum, s) => sum + (s.total ?? 0), 0)
			: null,
		hasArchiveSource: archiveSources.length > 0,
		feed:
			feedSources.length > 0
				? {
						collectedCount: feedCollectedCount,
						unreadCount: feedCollectedCount - feedCompletedCount,
					}
				: null,
	};
}

/** 정주행 화면 요약 줄과, 모두 메모했을 때 그 아래에 붙는 한 줄 */
export interface IFBlogSummaryText {
	summaryText: string;
	allMemoedText: string | null;
}

/**
 * 현재 필터 범위의 소스들로 요약 문구를 만든다.
 * @description 전체 수집형 소스가 있으면 기존 진행 요약을 두고, 피드 소스는 뒤에 안 읽은 글 수를 덧붙인다.
 * 피드 소스만 있으면 안 읽은 글 수만 말한다.
 */
export function getBlogSummaryText(
	sources: readonly TSummarySource[],
): IFBlogSummaryText {
	const totals = getBlogSummaryTotals(sources);
	const feedSource = sources.find((source) => isFeedBlog(source.blogId));
	const feedUnreadText = totals.feed
		? `안 읽은 글 ${totals.feed.unreadCount}개`
		: null;

	if (!totals.hasArchiveSource && totals.feed) {
		const isAllFeedMemoed =
			totals.feed.collectedCount > 0 && totals.feed.unreadCount <= 0;

		return {
			summaryText: feedUnreadText ?? "",
			allMemoedText: isAllFeedMemoed
				? "모은 글에는 모두 메모를 남겼어요."
				: null,
		};
	}

	const archiveText =
		totals.confirmedTotal === null
			? `현재 수집한 글 ${totals.collectedCount}개 · 메모 완료 ${totals.completedCount}개`
			: `전체 글 ${totals.confirmedTotal}개 · 메모할 글 ${totals.confirmedTotal - totals.completedCount}개 · 메모 완료 ${totals.completedCount}개`;
	const isAllCollectedMemoed =
		totals.confirmedTotal === null &&
		totals.collectedCount > 0 &&
		totals.completedCount >= totals.collectedCount;

	return {
		summaryText:
			feedSource && feedUnreadText
				? `${archiveText} · ${getBlogDisplayName(feedSource.blogId)} ${feedUnreadText}`
				: archiveText,
		allMemoedText: isAllCollectedMemoed
			? "현재 수집한 글에는 모두 메모를 남겼어요"
			: null,
	};
}
