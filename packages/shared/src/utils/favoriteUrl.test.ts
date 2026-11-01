import { describe, expect, it } from "vitest";
import { normalizeFavoriteUrl, resolveFavoriteTitle } from "./favoriteUrl";

describe("normalizeFavoriteUrl", () => {
	it("앞뒤 공백을 자른다", () => {
		expect(normalizeFavoriteUrl("  https://example.com/a  ")).toBe(
			"https://example.com/a",
		);
	});

	it("scheme이 없으면 https를 붙인다", () => {
		expect(normalizeFavoriteUrl("example.com/article")).toBe(
			"https://example.com/article",
		);
	});

	it("http는 그대로 둔다", () => {
		expect(normalizeFavoriteUrl("http://example.com/")).toBe(
			"http://example.com/",
		);
	});

	it.each([
		"",
		"   ",
		"ftp://example.com",
		"javascript://x",
		"https://",
		"a b c",
	])("%j는 올바르지 않은 URL이다", (input) => {
		expect(normalizeFavoriteUrl(input)).toBeNull();
	});
});

describe("resolveFavoriteTitle", () => {
	it("제목이 있으면 trim해서 쓴다", () => {
		expect(resolveFavoriteTitle("https://example.com", "  글  ")).toBe("글");
	});

	it("제목이 비면 www를 뗀 도메인을 쓴다", () => {
		expect(resolveFavoriteTitle("https://www.example.com/a", "  ")).toBe(
			"example.com",
		);
	});
});
