import { expect, test } from "@playwright/test";

/** 구현의 경로 상수와 독립적으로 관리하는 공개 검색 페이지 목록입니다. */
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

/** 한국어로만 존재하는 공개 검색 페이지 목록입니다. */
const KOREAN_ONLY_PATHS = ["compare/chrome-memo-extensions"] as const;

/** 언어별로 검사할 공개 페이지 목록입니다. */
const PUBLIC_PATHS_BY_LANGUAGE = {
	ko: [...PUBLIC_PATHS, ...KOREAN_ONLY_PATHS],
	en: [...PUBLIC_PATHS],
} as const;

test.describe("공개 페이지 공유 메타데이터", () => {
	for (const language of ["ko", "en"] as const) {
		for (const publicPath of PUBLIC_PATHS_BY_LANGUAGE[language]) {
			test(`${language}/${publicPath}의 검색 정보와 공유 정보가 일치한다.`, async ({
				page,
			}) => {
				const localizedPath = `/${language}/${publicPath}`;
				const response = await page.goto(localizedPath);
				expect(response?.status()).toBe(200);
				await expect(page.locator("head > title")).toHaveCount(1);
				const title = await page.title();
				expect(title.trim()).not.toBe("");
				expect(title).not.toBe(language === "ko" ? "웹 메모" : "Web Memo");

				const descriptionTag = page.locator('meta[name="description"]');
				await expect(descriptionTag).toHaveCount(1);
				const description = await descriptionTag.getAttribute("content");
				expect(description?.trim()).toBeTruthy();
				const canonicalTag = page.locator('link[rel="canonical"]');
				await expect(canonicalTag).toHaveCount(1);
				const canonical = await canonicalTag.getAttribute("href");
				expect(canonical).toBeTruthy();
				expect(new URL(canonical ?? "").pathname).toBe(localizedPath);

				const expectedMetadata = [
					['property="og:title"', title],
					['property="og:description"', description],
					['property="og:type"', "website"],
					[
						'property="og:site_name"',
						language === "ko" ? "웹 메모" : "Web Memo",
					],
					['property="og:locale"', language === "ko" ? "ko_KR" : "en_US"],
					['property="og:url"', canonical],
					['name="twitter:card"', "summary_large_image"],
					['name="twitter:title"', title],
					['name="twitter:description"', description],
					[
						'name="twitter:image"',
						new URL("/og-image.png", canonical ?? "").href,
					],
				] as const;

				for (const [selector, content] of expectedMetadata) {
					const metadataTag = page.locator(`meta[${selector}]`);
					await expect(metadataTag).toHaveCount(1);
					await expect(metadataTag).toHaveAttribute("content", content ?? "");
				}
			});
		}
	}
});
