import { describe, expect, it } from "vitest";
import { getPageKey, normalizeUrl } from "./Url";

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
