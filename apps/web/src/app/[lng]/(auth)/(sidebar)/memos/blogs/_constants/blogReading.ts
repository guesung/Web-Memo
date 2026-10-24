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
