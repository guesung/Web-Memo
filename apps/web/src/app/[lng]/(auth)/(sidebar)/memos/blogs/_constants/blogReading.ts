import type {
	TBlogReadingSort,
	TBlogSourceViewState,
} from "@web-memo/shared/types";

/** 정렬 선택지. 기본은 과거부터(정주행 순서)다. */
export const BLOG_READING_SORT_OPTIONS: readonly {
	value: TBlogReadingSort;
	labelKey: string;
}[] = [
	{ value: "oldest", labelKey: "blogs.sortOldest" },
	{ value: "newest", labelKey: "blogs.sortNewest" },
];

/**
 * 피드 소스(긱뉴스)의 수집 상태별 제목·설명 번역 키.
 * @description 피드는 총 글 수·재개 개념이 없다. 실패 계열은 대기보다 우선하고, 그 밖은 정상 문구다.
 */
export const BLOG_FEED_SOURCE_COPY_KEYS: Record<
	TBlogSourceViewState,
	{ titleKey: string; descriptionKey: string }
> = {
	waiting: {
		titleKey: "blogs.status.feed.waitingTitle",
		descriptionKey: "blogs.status.feed.waitingCopy",
	},
	collecting: {
		titleKey: "blogs.status.feed.normalTitle",
		descriptionKey: "blogs.status.feed.normalCopy",
	},
	complete: {
		titleKey: "blogs.status.feed.normalTitle",
		descriptionKey: "blogs.status.feed.normalCopy",
	},
	refreshing: {
		titleKey: "blogs.status.feed.normalTitle",
		descriptionKey: "blogs.status.feed.normalCopy",
	},
	partialFailed: {
		titleKey: "blogs.status.feed.failedTitle",
		descriptionKey: "blogs.status.feed.failedCopy",
	},
	resumeQueued: {
		titleKey: "blogs.status.feed.failedTitle",
		descriptionKey: "blogs.status.feed.failedCopy",
	},
	refreshFailed: {
		titleKey: "blogs.status.feed.failedTitle",
		descriptionKey: "blogs.status.feed.failedCopy",
	},
};

/** 소스 수집 상태별 제목 번역 키. 설계서 상태 계약 표의 수집 행과 1:1이다. */
export const BLOG_SOURCE_TITLE_KEYS: Record<TBlogSourceViewState, string> = {
	waiting: "blogs.status.waitingTitle",
	collecting: "blogs.status.collectingTitle",
	partialFailed: "blogs.status.partialTitle",
	resumeQueued: "blogs.status.queuedTitle",
	complete: "blogs.status.completeTitle",
	refreshing: "blogs.status.refreshingTitle",
	refreshFailed: "blogs.status.refreshFailedTitle",
};
