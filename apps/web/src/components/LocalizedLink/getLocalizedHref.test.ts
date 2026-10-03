import { describe, expect, it } from "vitest";
import { getLocalizedHref } from "./getLocalizedHref";

describe("getLocalizedHref", () => {
	it("언어 없는 내부 경로에 접두사를 붙이고 쿼리와 해시를 유지한다", () => {
		expect(getLocalizedHref("ko", "/memos?category=일상#top")).toBe(
			"/ko/memos?category=일상#top",
		);
		expect(getLocalizedHref("en", "/")).toBe("/en");
	});

	it("이미 언어가 있는 경로는 요청한 언어로 대체한다", () => {
		expect(getLocalizedHref("ko", "/en/memos")).toBe("/ko/memos");
		expect(getLocalizedHref("en", "/ko")).toBe("/en");
	});

	it("URL 객체의 query 및 hash를 보존한다", () => {
		const href = {
			pathname: "/memos",
			query: { category: "일상" },
			hash: "top",
		};
		expect(getLocalizedHref("ko", href)).toEqual({
			pathname: "/ko/memos",
			query: { category: "일상" },
			hash: "top",
		});
		expect(href.pathname).toBe("/memos");
	});

	it("외부 URL 객체와 언어가 이미 붙은 API/콜백 경로를 거부한다", () => {
		expect(() =>
			getLocalizedHref("ko", {
				protocol: "https:",
				hostname: "example.com",
				pathname: "/memos",
			}),
		).toThrow();
		expect(() => getLocalizedHref("en", "/ko/api/version")).toThrow();
		expect(() => getLocalizedHref("en", "/en/auth/callback")).toThrow();
	});

	it.each([
		"https://example.com",
		"mailto:a@example.com",
		"#demo",
		"//example.com",
		"/api/version",
		"/auth/callback",
	])("내부 페이지가 아닌 경로를 거부한다: %s", (href) => {
		expect(() => getLocalizedHref("ko", href)).toThrow();
	});
});
