import { describe, expect, it } from "vitest";
import { getStructuredDataIssues, parseSeoHtml } from "./seo-html.mjs";

describe("SEO HTML 파싱", () => {
	it("Twitter·hreflang·@graph 구조화 데이터를 추출한다", () => {
		const metadata = parseSeoHtml(`<html lang="ko"><head>
			<meta name="twitter:card" content="summary_large_image">
			<link rel="alternate" hreflang="ko" href="https://www.webmemo.xyz/ko/introduce">
			<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@id":"#site"},{"@type":"Organization","name":"Web Memo","url":"https://www.webmemo.xyz"}]}</script>
		</head><body>본문</body></html>`);

		expect(metadata.twitter.card).toBe("summary_large_image");
		expect(metadata.hreflang).toEqual([
			{
				language: "ko",
				url: "https://www.webmemo.xyz/ko/introduce",
			},
		]);
		expect(metadata.structuredData.nodes).toHaveLength(1);
		expect(getStructuredDataIssues(metadata.structuredData)).toEqual([]);
	});

	it("JSON-LD 구문 오류와 지원 타입의 최소 필드 누락을 구분한다", () => {
		const metadata = parseSeoHtml(`<script type="application/ld+json">{invalid</script>
			<script type="application/ld+json">[{"@type":"WebPage","name":"소개"},{"@type":"FAQPage","mainEntity":[{"name":"Q"}]}]</script>`);
		const issues = getStructuredDataIssues(metadata.structuredData);

		expect(issues.map((issue) => issue.code)).toEqual([
			"JSON_LD_INVALID_JSON",
			"JSON_LD_REQUIRED_FIELD_MISSING",
			"JSON_LD_REQUIRED_FIELD_MISSING",
		]);
		expect(issues.map((issue) => issue.field)).toEqual([
			"jsonLd[0]",
			"WebPage.url",
			"FAQPage.mainEntity.name/acceptedAnswer.text",
		]);
	});
});
