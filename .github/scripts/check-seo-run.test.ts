import { appendFile, readFile, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	addDuplicateWarnings,
	createReport,
	inspectPage,
	parseSitemap,
	runSeoCheck,
	SEO_URLS,
} from "./check-seo.mjs";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
}));

/** 운영 페이지처럼 메타데이터를 포함하는 작은 서버 HTML입니다. */
const PAGE_URL = "https://www.webmemo.xyz/ko/introduce";
const VALID_HTML = `<html lang="ko"><head><title>웹 메모 소개</title>
<meta name="description" content="웹에서 읽은 내용을 저장합니다.">
<link rel="canonical" href="${PAGE_URL}">
<meta property="og:title" content="웹 메모"><meta property="og:description" content="메모 저장">
<meta property="og:url" content="${PAGE_URL}"><meta property="og:image" content="https://www.webmemo.xyz/image.png">
<meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head><body><h1>웹 메모</h1><p>페이지 내용을 저장하세요.</p></body></html>`;
const SITEMAP = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${PAGE_URL}</loc></url></urlset>`;
const htmlResponse = (html = VALID_HTML) =>
	new Response(html, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});
const imageResponse = () => {
	const image = Buffer.alloc(24);
	Buffer.from("89504e470d0a1a0a", "hex").copy(image);
	image.writeUInt32BE(1200, 16);
	image.writeUInt32BE(630, 20);

	return new Response(image, { headers: { "content-type": "image/png" } });
};

beforeEach(() => {
	process.exitCode = 0;
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.clearAllMocks();
	process.exitCode = 0;
});

describe("SEO 대상·중복·리포트", () => {
	it("정상 sitemap의 URL만 검사하고 fallback URL은 요청하지 않는다", async () => {
		const fetcher = vi.fn(async (url: string) => {
			if (url.endsWith("image.png")) {
				return imageResponse();
			}
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
			if (
				url.startsWith("http://") ||
				url.startsWith("https://webmemo.xyz") ||
				url.endsWith("/introduce/")
			) {
				return new Response(null, {
					status: 301,
					headers: { location: PAGE_URL },
				});
			}

			return htmlResponse();
		});
		await runSeoCheck({ fetcher });

		expect(fetcher).toHaveBeenCalled();
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
		expect(report.schemaVersion).toBe(2);
		expect(report.warnings).toBe(5);
		expect(markdown).toContain("title 중복");
		expect(markdown).toContain("최종 URL:");
	});

	it("이전 보고서가 없으면 현재 이슈를 전부 신규로 분류하지 않는다", async () => {
		await runSeoCheck({
			fetcher: async (url) => {
				if (url.endsWith("image.png")) {
					return imageResponse();
				}
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
				if (
					url.startsWith("http://") ||
					url.startsWith("https://webmemo.xyz") ||
					url.endsWith("/introduce/")
				) {
					return new Response(null, {
						status: 301,
						headers: { location: PAGE_URL },
					});
				}

				return htmlResponse();
			},
		});

		expect(readFile).not.toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalledWith(
			"artifacts/seo/seo-report.json",
			expect.stringContaining('"baselineStatus": "missing"'),
		);
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
		vi.stubEnv("GITHUB_STEP_SUMMARY", "/tmp/seo-test-summary.md");
		await runSeoCheck({ fetcher });

		expect(fetcher).toHaveBeenCalledTimes(34);
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
