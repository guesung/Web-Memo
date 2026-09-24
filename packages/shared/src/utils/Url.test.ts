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
