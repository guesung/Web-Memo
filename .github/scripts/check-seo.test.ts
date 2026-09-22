import { appendFile, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	addDuplicateWarnings,
	createReport,
	inspectPage,
	parseSeoHtml,
	parseSitemap,
	runSeoCheck,
	SEO_URLS,
} from "./check-seo.mjs";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	mkdir: vi.fn(),
	writeFile: vi.fn(),
}));

/** 운영 페이지처럼 메타데이터를 포함하는 작은 서버 HTML입니다. */
const PAGE_URL = "https://www.webmemo.xyz/ko/introduce";
const VALID_HTML = `<html lang="ko"><head><title>웹 메모 소개</title>
<meta name="description" content="웹에서 읽은 내용을 저장합니다.">
<link rel="canonical" href="${PAGE_URL}">
<meta property="og:title" content="웹 메모"><meta property="og:description" content="메모 저장">
<meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="https://www.webmemo.xyz/image.png">
<meta property="og:type" content="website"></head><body><h1>웹 메모</h1><p>페이지 내용을 저장하세요.</p></body></html>`;
const SITEMAP = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${PAGE_URL}</loc></url></urlset>`;
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
		expect(page.issues).toHaveLength(10);
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
			{ severity: "error", message: "요청 실패: timeout" },
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
});

describe("SEO 대상·중복·리포트", () => {
	it("정상 sitemap의 URL만 검사하고 fallback URL은 요청하지 않는다", async () => {
		const fetcher = vi.fn(async (url: string) => {
			if (url.endsWith("sitemap.xml")) {
				return new Response(SITEMAP, {
					headers: { "content-type": "application/xml" },
				});
			}
			if (url.endsWith("robots.txt")) {
				return new Response("User-agent: *\nAllow: /", {
					headers: { "content-type": "text/plain" },
				});
			}
			if (/\/(ko|en)$/.test(url)) {
				return new Response(null, {
					status: 307,
					headers: { location: `${url}/introduce` },
				});
			}

			return htmlResponse(VALID_HTML);
		});
		vi.stubGlobal("fetch", fetcher);
		await runSeoCheck();

		expect(fetcher).toHaveBeenCalledTimes(14);
		expect(fetcher.mock.calls.some(([url]) => url.includes("/features/"))).toBe(
			false,
		);
		expect(process.exitCode).toBe(0);
	});

	it("sitemap에서 실제 URL을 읽고 외부 도메인·잘못된 XML을 거부한다", () => {
		expect(parseSitemap(SITEMAP)).toEqual([PAGE_URL]);
		expect(() =>
			parseSitemap(SITEMAP.replace(PAGE_URL, "https://example.com/")),
		).toThrow();
		expect(() => parseSitemap("not XML")).toThrow();
		expect(() =>
			parseSitemap(
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
			),
		).toThrow();
	});

	it("동일 URL의 두 크롤러 결과는 중복으로 세지 않는다", async () => {
		const pages = await Promise.all(
			["mobile", "pc"].map((agent) =>
				inspectPage({
					url: PAGE_URL,
					agent,
					fetcher: async () => htmlResponse(),
				}),
			),
		);
		addDuplicateWarnings(pages);

		expect(pages.flatMap((page) => page.issues)).toEqual([]);
	});

	it("서로 다른 URL의 동일 title·description은 중복 경고로 남긴다", async () => {
		const pages = await Promise.all(
			[PAGE_URL, "https://www.webmemo.xyz/ko/memo"].map((url) =>
				inspectPage({ url, agent: "pc", fetcher: async () => htmlResponse() }),
			),
		);
		addDuplicateWarnings(pages);
		const { report, markdown } = createReport(pages);

		expect(report.errors).toBe(0);
		expect(report.warnings).toBe(5);
		expect(markdown).toContain("title 중복");
		expect(markdown).toContain("최종 URL:");
	});

	it("robots.txt HTML 응답을 오류로 판정한다", async () => {
		const page = await inspectPage({
			url: "https://www.webmemo.xyz/robots.txt",
			agent: "pc",
			kind: "robots",
			fetcher: async () => htmlResponse(),
		});

		expect(page.issues.some((issue) => issue.severity === "error")).toBe(true);
	});

	it("전체 요청 실패 시 fallback 10개 URL과 리포트를 유지하고 종료 코드를 설정한다", async () => {
		const fetcher = vi.fn(async () => {
			throw new Error("offline");
		});
		vi.stubGlobal("fetch", fetcher);
		vi.stubEnv("GITHUB_STEP_SUMMARY", "/tmp/seo-test-summary.md");
		await runSeoCheck();

		expect(fetcher).toHaveBeenCalledTimes(28);
		expect(SEO_URLS).toHaveLength(10);
		expect(writeFile).toHaveBeenCalledWith(
			"artifacts/seo/seo-report.json",
			expect.stringContaining('"errors":'),
		);
		expect(writeFile).toHaveBeenCalledWith(
			"artifacts/seo/seo-report.md",
			expect.stringContaining("offline"),
		);
		expect(appendFile).toHaveBeenCalledWith(
			"/tmp/seo-test-summary.md",
			expect.stringContaining("offline"),
		);
		expect(process.exitCode).toBe(1);
	});
});
