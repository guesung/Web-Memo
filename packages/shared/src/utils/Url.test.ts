import { describe, expect, it } from "vitest";
import { getPageKey, getPathKey, normalizeUrl, toLooseUrlKey } from "./Url";

describe("getPageKey", () => {
	it.each([
		[
			"https://example.com/article?utm_source=newsletter&id=42&gclid=abc",
			"https://example.com/article?id=42",
		],
		[
			"https://example.com/article?ID=42&fbclid=abc&ID=43",
			"https://example.com/article?ID=42&ID=43",
		],
		[
			"https://example.com/article?UTM_Campaign=fall&msclkid=abc",
			"https://example.com/article",
		],
		[
			"https://example.com/article?source=feed&ref=home&page=2",
			"https://example.com/article?source=feed&ref=home&page=2",
		],
		[
			"https://example.com/article?utm%5Fsource=feed&id=42",
			"https://example.com/article?utm%5Fsource=feed&id=42",
		],
		[
			"https://example.com/article?utm_source=&id=42#section",
			"https://example.com/article?id=42",
		],
		[
			"https://www.youtube.com/watch?v=abc&utm_source=newsletter&t=30",
			"https://www.youtube.com/watch?v=abc",
		],
		["https://example.com", "https://example.com/"],
		["https://EXAMPLE.com:443/a", "https://example.com/a"],
		["https://user:pass@EXAMPLE.com/a", "https://example.com/a"],
		["ftp://EXAMPLE.com:21/a", "ftp://example.com/a"],
		["https://example.com/a/../b", "https://example.com/b"],
		["https://example.com/a/%2E%2E/b", "https://example.com/b"],
		["https://example.com/a/..", "https://example.com/"],
		["https://example.com/한글", "https://example.com/%ED%95%9C%EA%B8%80"],
		["https://사용자.한국/a", "https://xn--vf4bo3i2ta.xn--3e0b707e/a"],
		["https://example.com/?q=it's", "https://example.com/?q=it%27s"],
		[
			"https://www.youtube.com/watch?v=a%62c&t=10",
			"https://www.youtube.com/watch?v=abc",
		],
		[
			"https://www.youtube.com/shorts/abc",
			"https://www.youtube.com/shorts/abc?v=null",
		],
		["https://www.youtube.com/watch?v", "https://www.youtube.com/watch?v="],
		["memo://local/123", "null/123"],
		["chrome://settings", "null"],
		["chrome://settings/privacy", "null/privacy"],
		["file:///Users/home/a.pdf", "null/Users/home/a.pdf"],
		["about:blank", "nullblank"],
	])("uses the same page key for %s", (url, expectedPageKey) => {
		expect(getPageKey(url)).toBe(expectedPageKey);
	});

	it("keeps distinct content parameters separate", () => {
		expect(getPageKey("https://example.com/article?id=1")).not.toBe(
			getPageKey("https://example.com/article?id=2"),
		);
	});

	it("does not change the saved URL representation", () => {
		const url = "https://example.com/article?id=42&utm_source=newsletter";
		expect(normalizeUrl(url)).toBe(url);
		expect(getPageKey(url)).toBe("https://example.com/article?id=42");
	});

	it("rejects invalid URLs", () => {
		expect(() => getPageKey("not a URL")).toThrow("Invalid URL");
	});
});

describe("getPathKey", () => {
	it("쿼리만 다른 URL은 같은 경로 키를 가진다", () => {
		expect(
			getPathKey("https://toss.tech/article/harness-for-team-productivity?da"),
		).toBe(
			getPathKey("https://toss.tech/article/harness-for-team-productivity?d"),
		);
		expect(getPathKey("https://example.com/article?id=1&utm_source=x")).toBe(
			"https://example.com/article",
		);
	});

	it("경로가 다르면 다른 경로 키를 가진다", () => {
		expect(getPathKey("https://example.com/a?x=1")).not.toBe(
			getPathKey("https://example.com/ab?x=1"),
		);
	});

	it("YouTube는 영상 ID(v)를 경로 키에 남긴다", () => {
		expect(getPathKey("https://www.youtube.com/watch?v=abc&t=10")).toBe(
			"https://www.youtube.com/watch?v=abc",
		);
		expect(getPathKey("https://www.youtube.com/watch?v=abc")).not.toBe(
			getPathKey("https://www.youtube.com/watch?v=def"),
		);
	});
});

describe("toLooseUrlKey", () => {
	const BASE_KEY = "example.com/post/1";

	it.each([
		"https://example.com/post/1",
		"https://www.example.com/post/1",
		"https://m.example.com/post/1",
		"https://example.com/post/1/",
		"https://example.com/post/1#section",
		"https://example.com/post/1?utm_source=x&utm_medium=y",
		"https://example.com/post/1?fbclid=abc",
		"https://example.com/post/1?gclid=abc",
		"https://example.com/post/1?ref=home",
		"https://example.com/post/1?si=share",
		"http://example.com/post/1",
	])("%s 를 같은 키로 만든다", (url) => {
		expect(toLooseUrlKey(url)).toBe(BASE_KEY);
	});

	it("추적 파라미터가 아닌 쿼리는 남기고 순서를 맞춘다", () => {
		expect(toLooseUrlKey("https://example.com/list?page=2&sort=new")).toBe(
			toLooseUrlKey("https://example.com/list?sort=new&page=2&utm_source=x"),
		);
		expect(toLooseUrlKey("https://example.com/list?page=2")).not.toBe(
			toLooseUrlKey("https://example.com/list?page=3"),
		);
	});

	it("youtu.be 단축 주소와 m.youtube.com을 youtube.com/watch 키로 맞춘다", () => {
		const expected = "youtube.com/watch?v=abc123";

		expect(toLooseUrlKey("https://youtu.be/abc123?si=xyz")).toBe(expected);
		expect(toLooseUrlKey("https://m.youtube.com/watch?v=abc123&t=30")).toBe(
			expected,
		);
		expect(toLooseUrlKey("https://www.youtube.com/watch?v=abc123")).toBe(
			expected,
		);
	});

	it("경로가 다르면 다른 키다", () => {
		expect(toLooseUrlKey("https://example.com/post/2")).not.toBe(BASE_KEY);
	});

	it("파싱할 수 없는 URL이면 null을 돌려준다", () => {
		expect(toLooseUrlKey("not a url")).toBeNull();
	});
});
