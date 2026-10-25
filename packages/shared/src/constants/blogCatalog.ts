import type { IFBlogCatalogItem, TBlogId } from "../types/blogReading";

/**
 * 블로그 정주행이 지원하는 블로그 목록(표시 순서).
 * @description `blogId`는 SQL `memo.is_supported_blog`의 값(`toss`, `daangn`, `geeknews`)과 정확히 같아야 한다.
 * 블로그를 더하려면 마이그레이션의 지원 소스·URL 허용 함수와 함께 고친다. 색·아이콘은 각 화면이 정한다.
 */
export const BLOG_CATALOG: readonly IFBlogCatalogItem[] = [
	{
		blogId: "toss",
		displayName: { ko: "토스", en: "Toss" },
		homeUrl: "https://toss.tech/",
		kind: "archive",
	},
	{
		blogId: "daangn",
		displayName: { ko: "당근", en: "Daangn" },
		homeUrl: "https://medium.com/daangn",
		kind: "archive",
	},
	{
		blogId: "geeknews",
		displayName: { ko: "긱뉴스", en: "GeekNews" },
		homeUrl: "https://news.hada.io/",
		kind: "feed",
	},
];

/** 최근 글만 쌓이는 피드 소스인지. 피드는 전체 글 수가 없어 진행률 대신 안 읽은 글 수를 보여준다. */
export const isFeedBlog = (blogId: TBlogId) =>
	BLOG_CATALOG.some((blog) => blog.blogId === blogId && blog.kind === "feed");

/** 블로그 정주행 목록 한 페이지의 글 수. `get_blog_reading_page`의 기본값과 같다. */
export const BLOG_READING_PAGE_SIZE = 30;
