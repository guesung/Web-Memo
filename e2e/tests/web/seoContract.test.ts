import { expect, test } from "../fixtures/web";

/** 생성 코드와 독립적으로 명시한 색인 대상 경로입니다. */
const PUBLIC_PATHS = [
	"introduce",
	"privacy",
	"features/memo",
	"features/save-articles",
	"features/youtube-summary",
	"use-cases/developer",
	"use-cases/job-hunting",
	"use-cases/learning",
	"use-cases/news-reading",
	"use-cases/research",
	"use-cases/tech-article",
	"use-cases/youtube-notes",
] as const;

/** 로그인 여부와 무관하게 첫 응답부터 색인을 막아야 하는 HTML 경로입니다. */
const NOINDEX_PATHS = ["login", "memos", "highlights", "admin", "uninstall"];

// 비로그인 상태의 화면을 검증하므로 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("공개 검색 계약", () => {
	test("sitemap은 정확한 공개 URL과 왕복 언어 대응만 제공한다.", async ({
		page,
		request,
		baseURL,
	}) => {
		const response = await request.get("/sitemap.xml");
		expect(response.ok()).toBe(true);
		expect(response.headers()["content-type"]).toMatch(
			/(?:application|text)\/xml/,
		);
		const sitemap = await page.evaluate(
			(xml) => {
				const document = new DOMParser().parseFromString(
					xml,
					"application/xml",
				);

				return {
					parseErrors: document.getElementsByTagName("parsererror").length,
					lastModifiedCount: document.getElementsByTagName("lastmod").length,
					entries: Array.from(document.getElementsByTagName("url")).map(
						(entry) => ({
							url: entry.getElementsByTagName("loc")[0]?.textContent,
							alternates: Array.from(
								entry.getElementsByTagNameNS(
									"http://www.w3.org/1999/xhtml",
									"link",
								),
							).map((link) => ({
								language: link.getAttribute("hreflang"),
								url: link.getAttribute("href"),
								rel: link.getAttribute("rel"),
							})),
						}),
					),
				};
			},
			await response.text(),
		);
		expect(sitemap.parseErrors).toBe(0);
		expect(sitemap.lastModifiedCount).toBe(0);
		const expectedUrls = PUBLIC_PATHS.flatMap((path) =>
			["ko", "en"].map((language) => `${baseURL}/${language}/${path}`),
		);
		expect(sitemap.entries.map((entry) => entry.url).sort()).toEqual(
			expectedUrls.sort(),
		);
		expect(new Set(sitemap.entries.map((entry) => entry.url)).size).toBe(24);

		for (const entry of sitemap.entries) {
			const path = new URL(entry.url ?? "").pathname.slice(4);
			expect(entry.alternates).toHaveLength(3);
			expect(entry.alternates).toEqual(
				expect.arrayContaining([
					{ language: "ko", url: `${baseURL}/ko/${path}`, rel: "alternate" },
					{ language: "en", url: `${baseURL}/en/${path}`, rel: "alternate" },
					{
						language: "x-default",
						url: `${baseURL}/en/${path}`,
						rel: "alternate",
					},
				]),
			);
			for (const alternate of entry.alternates) {
				const target = sitemap.entries.find(
					(candidate) => candidate.url === alternate.url,
				);
				expect(target?.alternates.some((link) => link.url === entry.url)).toBe(
					true,
				);
			}
		}
	});

	for (const language of ["ko", "en"]) {
		for (const path of PUBLIC_PATHS) {
			test(`${language}/${path}의 canonical·hreflang·JSON-LD 계약이 유효하다.`, async ({
				page,
				baseURL,
			}) => {
				const canonical = `${baseURL}/${language}/${path}`;
				const response = await page.goto(`/${language}/${path}`);
				expect(response?.ok()).toBe(true);
				expect(response?.headers()["x-robots-tag"] ?? "").not.toMatch(
					/noindex|none/i,
				);
				await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
				await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
					"href",
					canonical,
				);
				await expect(
					page.locator('link[rel="alternate"][hreflang]'),
				).toHaveCount(3);
				for (const alternateLanguage of ["ko", "en", "x-default"]) {
					const targetLanguage =
						alternateLanguage === "x-default" ? "en" : alternateLanguage;
					await expect(
						page.locator(
							`link[rel="alternate"][hreflang="${alternateLanguage}"]`,
						),
					).toHaveAttribute("href", `${baseURL}/${targetLanguage}/${path}`);
				}
				const robots = await page
					.locator('meta[name="robots"], meta[name="googlebot"]')
					.evaluateAll((elements) =>
						elements.map((element) => element.getAttribute("content") ?? ""),
					);
				for (const directive of robots) {
					expect(directive).not.toMatch(/noindex|none/i);
				}
				const scripts = await page
					.locator('script[type="application/ld+json"]')
					.allTextContents();
				const schemas: IFSchema[] = scripts.map((script) => JSON.parse(script));
				if (path === "introduce") {
					for (const schemaType of ["FAQPage", "HowTo"]) {
						expect(
							schemas.filter((schema) => schema["@type"] === schemaType),
						).toHaveLength(1);
					}
				}
				if (path.startsWith("features/")) {
					const webPages = schemas.filter(
						(schema) => schema["@type"] === "WebPage",
					);
					expect(webPages).toHaveLength(1);
					expect(webPages[0].url).toBe(canonical);
				}
			});
		}
		for (const path of NOINDEX_PATHS) {
			test(`${language}/${path}의 최초 응답에 noindex·nofollow가 있다.`, async ({
				request,
			}) => {
				const response = await request.get(`/${language}/${path}`, {
					maxRedirects: 0,
				});
				const directives = (response.headers()["x-robots-tag"] ?? "")
					.toLowerCase()
					.split(/\s*,\s*/);
				expect(directives).toEqual(
					expect.arrayContaining(["noindex", "nofollow"]),
				);
			});
		}
	}

	test("robots는 sitemap을 안내하고 noindex HTML의 크롤링을 허용한다.", async ({
		request,
		baseURL,
	}) => {
		const response = await request.get("/robots.txt");
		expect(response.ok()).toBe(true);
		const lines = (await response.text())
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
		expect(lines).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
		expect(lines.filter((line) => line.startsWith("User-Agent:"))).toEqual([
			"User-Agent: *",
		]);
		expect(lines).toContain("Allow: /");
		const disallowedPaths = lines
			.filter((line) => line.startsWith("Disallow:"))
			.map((line) => line.slice("Disallow:".length).trim());
		expect(disallowedPaths.sort()).toEqual(["/api/", "/auth/", "/private/"]);
		for (const language of ["ko", "en"]) {
			for (const path of NOINDEX_PATHS) {
				expect(
					disallowedPaths.some((disallowed) =>
						`/${language}/${path}`.startsWith(disallowed),
					),
				).toBe(false);
			}
		}
	});
});

/** 페이지가 출력하는 구조화 데이터에서 검증할 필드입니다. */
interface IFSchema {
	"@type"?: string;
	url?: string;
}
