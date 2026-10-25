import { describe, expect, it } from "vitest";
import { parseSeoHtml } from "./seo-html.mjs";
import {
	addDeviceDifferenceWarnings,
	addHreflangIssues,
} from "./seo-relations.mjs";

const createPage = ({ url, agent, html }: { url: string; agent: string; html: string }) => ({
	url,
	agent,
	kind: "page",
	status: 200,
	failure: null,
	metadata: parseSeoHtml(html),
	issues: [] as Array<{ code: string; field?: string }>,
});

describe("SEO 페이지 관계 검사", () => {
	it("PC·모바일이 모두 정상일 때만 메타데이터 차이를 경고한다", () => {
		const pages = [
			createPage({
				url: "https://www.webmemo.xyz/ko/introduce",
				agent: "pc",
				html: '<html lang="ko"><head><title>PC</title></head></html>',
			}),
			createPage({
				url: "https://www.webmemo.xyz/ko/introduce",
				agent: "mobile",
				html: '<html lang="ko"><head><title>Mobile</title></head></html>',
			}),
		];
		addDeviceDifferenceWarnings(pages);

		expect(pages.flatMap((page) => page.issues)).toEqual([
			expect.objectContaining({ code: "DEVICE_METADATA_MISMATCH", field: "title" }),
			expect.objectContaining({ code: "DEVICE_METADATA_MISMATCH", field: "title" }),
		]);
	});

	it("hreflang 자기 참조와 상호 복귀 링크를 검증한다", () => {
		const koUrl = "https://www.webmemo.xyz/ko/introduce";
		const enUrl = "https://www.webmemo.xyz/en/introduce";
		const pages = [
			createPage({
				url: koUrl,
				agent: "pc",
				html: `<html lang="ko"><link rel="alternate" hreflang="ko" href="${koUrl}"><link rel="alternate" hreflang="en" href="${enUrl}"></html>`,
			}),
			createPage({
				url: enUrl,
				agent: "pc",
				html: `<html lang="en"><link rel="alternate" hreflang="en" href="${enUrl}"></html>`,
			}),
		];
		addHreflangIssues(pages);

		expect(pages[0].issues).toEqual([
			expect.objectContaining({ code: "HREFLANG_RETURN_LINK_MISSING" }),
		]);
		expect(pages[1].issues).toEqual([]);
	});

	it("html lang이 틀려도 URL 언어의 hreflang 자기 참조를 인정한다", () => {
		const enUrl = "https://www.webmemo.xyz/en/introduce";
		const pages = [
			createPage({
				url: enUrl,
				agent: "pc",
				html: `<html lang="ko"><link rel="alternate" hreflang="en" href="${enUrl}"></html>`,
			}),
		];
		addHreflangIssues(pages);

		expect(pages[0].issues).toEqual([]);
	});

	it("상대 URL과 충돌하는 언어 선언을 오류로 판정하고 x-default는 강제하지 않는다", () => {
		const url = "https://www.webmemo.xyz/ko/introduce";
		const pages = [
			createPage({
				url,
				agent: "pc",
				html: `<html lang="ko"><link rel="alternate" hreflang="ko" href="/ko/introduce"><link rel="alternate" hreflang="ko" href="${url}"><link rel="alternate" hreflang="ko" href="https://www.webmemo.xyz/ko/other"></html>`,
			}),
		];
		addHreflangIssues(pages);

		expect(pages[0].issues.map((issue) => issue.code)).toContain("HREFLANG_URL_INVALID");
		expect(pages[0].issues.map((issue) => issue.code)).toContain("HREFLANG_CONFLICT");
		expect(pages[0].issues.map((issue) => issue.code)).not.toContain("HREFLANG_X_DEFAULT_MISSING");
	});
});
