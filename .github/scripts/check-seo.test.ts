import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createNormalizationVariants,
	inspectPage,
	parseSeoHtml,
} from "./check-seo.mjs";

/** 운영 페이지처럼 메타데이터를 포함하는 작은 서버 HTML입니다. */
const PAGE_URL = "https://www.webmemo.xyz/ko/introduce";
const VALID_HTML = `<html lang="ko"><head><title>웹 메모 소개</title>
<meta name="description" content="웹에서 읽은 내용을 저장합니다.">
<link rel="canonical" href="${PAGE_URL}">
<meta property="og:title" content="웹 메모"><meta property="og:description" content="메모 저장">
<meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="https://www.webmemo.xyz/image.png">
<meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head><body><h1>웹 메모</h1><p>페이지 내용을 저장하세요.</p></body></html>`;
const htmlResponse = (html = VALID_HTML) =>
	new Response(html, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.clearAllMocks();
	process.exitCode = 0;
});

describe("SEO SSR 검사", () => {
	it("예상 리다이렉트가 없으면 실패하고 SSR 엔티티는 올바르게 파싱한다", async () => {
		const page = await inspectPage({
			url: PAGE_URL,
			agent: "pc",
			expectedDestination: PAGE_URL,
			fetcher: async () => htmlResponse(),
		});

		expect(page.issues[0].severity).toBe("error");
		expect(parseSeoHtml("<title>메모 &amp; 저장</title>").title).toBe(
			"메모 & 저장",
		);
	});

	it("정상 HTML은 통과하며 요청에 Googlebot·타임아웃을 사용한다", async () => {
		const fetcher = vi.fn(async () => htmlResponse());
		const page = await inspectPage({ url: PAGE_URL, agent: "mobile", fetcher });

		expect(page.issues).toEqual([]);
		expect(fetcher).toHaveBeenCalledWith(
			PAGE_URL,
			expect.objectContaining({
				headers: { "User-Agent": expect.stringContaining("Googlebot") },
				signal: expect.any(AbortSignal),
				redirect: "manual",
			}),
		);
	});

	it("빈 SSR과 Googlebot noindex를 오류로 기록한다", async () => {
		const page = await inspectPage({
			url: PAGE_URL,
			agent: "pc",
			fetcher: async () =>
				htmlResponse(
					'<html><head><meta name="googlebot" content="NOINDEX,nofollow"></head><body><script>document.write("fake")</script><style>body {color:red}</style></body></html>',
				),
		});

		expect(page.metadata.bodyText).toBe("");
		expect(
			page.issues.filter((issue) => issue.severity === "error"),
		).toHaveLength(2);
	});

	it("메타 길이·canonical·lang·h1·OG 문제는 경고로 분류한다", async () => {
		const page = await inspectPage({
			url: PAGE_URL,
			agent: "pc",
			fetcher: async () =>
				htmlResponse(
					`<html lang="en"><head><title>${"a".repeat(61)}</title></head><body><p>content</p></body></html>`,
				),
		});

		expect(page.issues.every((issue) => issue.severity === "warning")).toBe(
			true,
		);
		expect(page.issues).toHaveLength(14);
	});

	it("비정상 HTTP와 비 HTML을 오류로 남긴다", async () => {
		const page = await inspectPage({
			url: PAGE_URL,
			agent: "pc",
			fetcher: async () =>
				new Response("unavailable", {
					status: 503,
					headers: { "content-type": "text/plain" },
				}),
		});

		expect(page.status).toBe(503);
		expect(
			page.issues.filter((issue) => issue.severity === "error"),
		).toHaveLength(2);
	});

	it("응답 헤더의 noindex도 판정한다", async () => {
		const page = await inspectPage({
			url: PAGE_URL,
			agent: "pc",
			fetcher: async () =>
				new Response(VALID_HTML, {
					headers: {
						"content-type": "text/html",
						"x-robots-tag": "googlebot: noindex",
					},
				}),
		});

		expect(page.issues[0]).toMatchObject({
			severity: "error",
			message: expect.stringContaining("색인 차단"),
		});
	});

	it("연결 실패에도 구조화된 결과를 반환한다", async () => {
		const page = await inspectPage({
			url: PAGE_URL,
			agent: "pc",
			fetcher: async () => {
				throw new Error("timeout");
			},
		});

		expect(page.status).toBeNull();
		expect(page.issues).toEqual([
			{ severity: "error", code: "REQUEST_FAILED", message: "요청 실패: timeout" },
		]);
	});

	it("리다이렉트 이력·최종 URL을 보존하고 예상된 언어 루트 이동은 통과한다", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 307,
					headers: { location: "/ko/introduce" },
				}),
			)
			.mockResolvedValueOnce(htmlResponse());
		const page = await inspectPage({
			url: "https://www.webmemo.xyz/ko",
			agent: "pc",
			expectedDestination: PAGE_URL,
			fetcher,
		});

		expect(page.finalUrl).toBe(PAGE_URL);
		expect(page.redirects).toEqual([
			{ url: "https://www.webmemo.xyz/ko", status: 307, destination: PAGE_URL },
		]);
		expect(page.issues).toEqual([]);
	});

	it("끝나지 않는 리다이렉트는 제한 횟수에서 실패한다", async () => {
		const fetcher = vi.fn(
			async () =>
				new Response(null, { status: 301, headers: { location: PAGE_URL } }),
		);
		const page = await inspectPage({ url: PAGE_URL, agent: "pc", fetcher });

		expect(fetcher).toHaveBeenCalledTimes(6);
		expect(page.issues.some((issue) => issue.severity === "error")).toBe(true);
	});

	it("URL 정규화는 정식 URL 수렴과 임시 리다이렉트를 구분한다", async () => {
		const variants = createNormalizationVariants(PAGE_URL);
		const page = await inspectPage({
			url: variants[0],
			agent: "pc",
			kind: "normalization",
			expectedDestination: PAGE_URL,
			fetcher: vi
				.fn()
				.mockResolvedValueOnce(
					new Response(null, {
						status: 302,
						headers: { location: PAGE_URL },
					}),
				)
				.mockResolvedValueOnce(htmlResponse()),
		});

		expect(variants).toEqual([
			"http://www.webmemo.xyz/ko/introduce",
			"https://webmemo.xyz/ko/introduce",
			"https://www.webmemo.xyz/ko/introduce/",
		]);
		expect(page.issues).toEqual([
			expect.objectContaining({
				code: "URL_NORMALIZATION_TEMPORARY_REDIRECT",
				severity: "warning",
			}),
		]);
	});
});
