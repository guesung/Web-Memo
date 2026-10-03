import { describe, expect, it } from "vitest";
import {
	getBlogArticlePageKey,
	getMediumPostId,
	isSameBlogArticle,
} from "./articleIdentity";
import fixtures from "./blogReadingFixtures.json";

describe("블로그 글 page_key (SQL memo.blog_page_key와 같은 fixture)", () => {
	it.each(fixtures.pageKey)("$url", ({ url, expected }) => {
		expect(getBlogArticlePageKey(url)).toBe(expected);
	});

	it("http(s)가 아니거나 해석할 수 없는 URL은 null이다", () => {
		expect(getBlogArticlePageKey("ftp://toss.tech/a")).toBeNull();
		expect(getBlogArticlePageKey("https://")).toBeNull();
		expect(getBlogArticlePageKey("")).toBeNull();
		expect(getBlogArticlePageKey(null)).toBeNull();
	});
});

describe("Medium 글 ID (SQL memo.blog_medium_post_id와 같은 fixture)", () => {
	it.each(fixtures.mediumPostId)("$url", ({ url, expected }) => {
		expect(getMediumPostId(url)).toBe(expected);
	});

	it("hash를 떼고 끝 슬래시를 허용한다", () => {
		expect(
			getMediumPostId("https://medium.com/daangn/slug-3fa344b4391b/#x"),
		).toBe("3fa344b4391b");
	});
});

describe("같은 글 판정", () => {
	const tossArticle = {
		blogId: "toss" as const,
		providerId: "1",
		pageKey: "https://toss.tech/article/x",
	};
	const daangnArticle = {
		blogId: "daangn" as const,
		providerId: "3fa344b4391b",
		pageKey: "https://medium.com/daangn/slug-3fa344b4391b",
	};

	it("추적 파라미터·hash만 다른 URL은 같은 글이다", () => {
		expect(
			isSameBlogArticle({
				article: tossArticle,
				url: "https://toss.tech/article/x?utm_source=a#top",
			}),
		).toBe(true);
	});

	it("당근은 slug가 달라도 Medium 글 ID가 같으면 같은 글이다", () => {
		expect(
			isSameBlogArticle({
				article: daangnArticle,
				url: "https://medium.com/p/3fa344b4391b",
			}),
		).toBe(true);
	});

	it("토스는 Medium 글 ID로 잇지 않는다", () => {
		expect(
			isSameBlogArticle({
				article: { ...tossArticle, providerId: "3fa344b4391b" },
				url: "https://medium.com/p/3fa344b4391b",
			}),
		).toBe(false);
	});
});
