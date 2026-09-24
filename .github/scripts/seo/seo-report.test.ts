import { writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectPage, runSeoCheck } from "./check-seo.mjs";
import { hasGooglebotNoindex, isGooglebotBlocked } from "./seo-report.mjs";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	mkdir: vi.fn(),
	writeFile: vi.fn(),
}));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	process.exitCode = 0;
});

describe("Googlebot robots.txt 범위", () => {
	it.each([
		["User-agent: *\nDisallow: /", true],
		["User-agent: Googlebot\nDisallow: /", true],
		["User-agent: bingbot\nDisallow: /", false],
		["User-agent: bingbot\nDisallow: /\nUser-agent: *\nAllow: /", false],
		["User-agent: *\nDisallow: /\nUser-agent: Googlebot\nAllow: /", false],
		["User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /", true],
		["User-agent: bingbot\nUser-agent: Googlebot\nDisallow: / # blocked", true],
		["User-agent: *\nDisallow: /private", false],
		["User-agent: *\nDisallow: /\nAllow: /", false],
		["User-agent: *\nDisallow: /*", true],
		["User-agent: *\nDisallow:", false],
	])("그룹·경로에 따라 전체 크롤링 차단을 판정한다: %s", (text, expected) => {
		expect(isGooglebotBlocked(text)).toBe(expected);
	});

	it("robots.txt 원문을 보관하고 URL 확정 시점까지 판정을 미룬다", async () => {
		const result = await inspectPage({
			url: "https://www.webmemo.xyz/robots.txt",
			agent: "pc",
			kind: "robots",
			fetcher: async () =>
				new Response("User-agent: *\nDisallow: /", {
					headers: { "content-type": "text/plain" },
				}),
		});

		expect(result.robotsText).toBe("User-agent: *\nDisallow: /");
		expect(result.issues).toEqual([]);
	});

	it.each([
		["Disallow: /\nAllow: /ko/\nAllow: /en/", "/ko/introduce", false],
		["Disallow: /\nAllow: /ko/\nAllow: /en/", "/en/introduce", false],
		["Disallow: /ko/\nDisallow: /en/", "/ko/introduce", true],
		["Disallow: /ko/\nDisallow: /en/", "/en/introduce", true],
		["Disallow: /ko/*\nAllow: /ko/public/", "/ko/public/memo", false],
		["Disallow: /*/private$", "/en/private", true],
		["Disallow: /*/private$", "/en/private/memo", false],
		["Disallow: /*?secret=", "/en/memo?secret=1", true],
		["Allow: /ko/\nDisallow: /ko/", "/ko/introduce", false],
		["Disallow: /ko/\nAllow: /ko/", "/ko/introduce", false],
	])(
		"경로·wildcard·종료 앵커·Allow 우선순위를 반영한다: %s",
		(rules, path, expected) => {
			expect(isGooglebotBlocked(`User-agent: *\n${rules}`, path)).toBe(
				expected,
			);
		},
	);

	it.each([
		["Disallow: /\nAllow: /ko/\nAllow: /en/", 0],
		["Disallow: /ko/\nDisallow: /en/", 4],
	])(
		"실제 sitemap URL별 차단 결과를 보고서에 남긴다: %s",
		async (rules, errors) => {
			vi.stubGlobal("fetch", async (url: string) => {
				if (
					url.startsWith("http://") ||
					url.startsWith("https://webmemo.xyz") ||
					url.endsWith("/introduce/")
				) {
					const language = url.includes("/en/") ? "en" : "ko";

					return new Response(null, {
						status: 301,
						headers: {
							location: `https://www.webmemo.xyz/${language}/introduce`,
						},
					});
				}
				if (url.endsWith("robots.txt")) {
					return new Response(`User-agent: *\n${rules}`, {
						headers: { "content-type": "text/plain" },
					});
				}
				if (url.endsWith("sitemap.xml")) {
					return new Response(
						'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.webmemo.xyz/ko/introduce</loc></url><url><loc>https://www.webmemo.xyz/en/introduce</loc></url></urlset>',
						{ headers: { "content-type": "application/xml" } },
					);
				}
				if (/\/(ko|en)$/.test(url)) {
					return new Response(null, {
						status: 307,
						headers: { location: `${url}/introduce` },
					});
				}

				return new Response("<html><body>서버 본문</body></html>", {
					headers: { "content-type": "text/html" },
				});
			});
			await runSeoCheck();
			const saved = vi
				.mocked(writeFile)
				.mock.calls.find(([path]) => path === "artifacts/seo/seo-report.json");
			const report = JSON.parse(String(saved?.[1]));

			expect(report.errors).toBe(errors);
			expect(process.exitCode).toBe(errors > 0 ? 1 : 0);
			expect(
				report.pages
					.filter((page) => page.kind === "robots")
					.every((page) => page.blockedUrls.length === errors / 2),
			).toBe(true);
			for (const page of report.pages.filter((item) => item.kind === "robots")) {
				const blockedIssues = page.issues.filter(
					(issue) => issue.code === "ROBOTS_BLOCKED",
				);
				expect(new Set(blockedIssues.map((issue) => issue.field)).size).toBe(
					blockedIssues.length,
				);
			}
		},
	);
});

describe("X-Robots-Tag 봇 범위", () => {
	it.each([
		["noindex", true],
		["none", true],
		["googlebot: noindex", true],
		["googlebot-news: noindex", false],
		["bingbot: noindex", false],
		["bingbot: nofollow, noindex", false],
		["bingbot: noindex, googlebot: index", false],
		["bingbot: index, googlebot: noindex", true],
		["noindex, bingbot: index", true],
		["googlebot: nofollow, max-snippet: 0, noindex", true],
		["bingbot: nofollow, max-snippet: 0, noindex", false],
	])("적용 대상 지시어만 확인한다: %s", (header, expected) => {
		expect(hasGooglebotNoindex(header)).toBe(expected);
	});

	it("Bing 전용 헤더는 Googlebot 요청 오류를 만들지 않는다", async () => {
		const result = await inspectPage({
			url: "https://www.webmemo.xyz/ko/introduce",
			agent: "mobile",
			fetcher: async () =>
				new Response("<html><body>서버 본문</body></html>", {
					headers: {
						"content-type": "text/html",
						"x-robots-tag": "bingbot: noindex",
					},
				}),
		});

		expect(result.issues.filter((issue) => issue.severity === "error")).toEqual(
			[],
		);
	});
});
