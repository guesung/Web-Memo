import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";

/** 공개 탐색 경로를 검증하는 지원 언어입니다. */
const LANGUAGES = ["ko", "en"] as const;

/** 소개 화면에서 한 번에 이동할 수 있어야 하는 기능과 사용 사례 화면입니다. */
const DIRECT_PUBLIC_PATHS = [
	PATHS.featuresMemo,
	PATHS.featuresSaveArticles,
	PATHS.featuresYoutubeSummary,
	PATHS.useCasesJobHunting,
	PATHS.useCasesLearning,
	PATHS.useCasesNewsReading,
	PATHS.useCasesResearch,
	PATHS.useCasesYoutubeNotes,
] as const;

/** 소개 화면에서 잡 헌팅을 거쳐 개발자 화면으로 이동하는 고정 경로입니다. */
const DEVELOPER_NAVIGATION_PATH = [
	PATHS.useCasesJobHunting,
	PATHS.useCasesDeveloper,
] as const;

/** 소개 화면에서 아티클 저장을 거쳐 기술 아티클 화면으로 이동하는 고정 경로입니다. */
const TECH_ARTICLE_NAVIGATION_PATH = [
	PATHS.featuresSaveArticles,
	PATHS.useCasesTechArticle,
] as const;

/** 고정된 2단계 경로에서 이미 화면 렌더링을 확인하는 경로입니다. */
const TWO_STEP_PUBLIC_PATHS = [
	PATHS.featuresSaveArticles,
	PATHS.useCasesDeveloper,
	PATHS.useCasesJobHunting,
	PATHS.useCasesTechArticle,
] as const;

test.describe.configure({ mode: "parallel" });
test.describe("공개 페이지 탐색 경로", () => {
	for (const language of LANGUAGES) {
		test(`${language} 공개 페이지는 명시된 링크 경로로 도달한다.`, async ({
			page,
		}) => {
			await assertPublicPage({ page, language, path: PATHS.introduce });
			await assertDirectPublicLinks({ page, language });

			await followPublicNavigationPath({
				page,
				language,
				paths: DEVELOPER_NAVIGATION_PATH,
			});

			await assertPublicPage({ page, language, path: PATHS.introduce });
			await followPublicNavigationPath({
				page,
				language,
				paths: TECH_ARTICLE_NAVIGATION_PATH,
			});

			for (const publicPath of DIRECT_PUBLIC_PATHS) {
				if (!TWO_STEP_PUBLIC_PATHS.includes(publicPath)) {
					await assertPublicPage({ page, language, path: publicPath });
				}
			}

			for (const publicPath of TWO_STEP_PUBLIC_PATHS) {
				await assertPublicResponse({ page, language, path: publicPath });
			}

			await assertPublicPage({ page, language, path: PATHS.privacy });
		});

		test(`${language} 도구와 기타 noindex 화면은 기존 메모 링크를 유지한다.`, async ({
			page,
		}) => {
			await assertNoindexBrandHref({ page, language, path: PATHS.login });

			await page.getByTestId("test-login-button").click();
			await page.waitForURL(`**/${language}${PATHS.memos}`);

			expect(new URL(page.url()).pathname).toBe(`/${language}${PATHS.memos}`);
			await expect(getBrandLink(page)).toHaveAttribute(
				"href",
				`/${language}${PATHS.memos}`,
			);
		});
	}
});

/** 소개 화면에 예상한 직접 링크가 정확한 언어별 href로 존재하는지 검증합니다. */
const assertDirectPublicLinks = async ({
	page,
	language,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
}) => {
	for (const publicPath of DIRECT_PUBLIC_PATHS) {
		const localizedPath = `/${language}${publicPath}`;
		const directLink = page.locator(`a[href="${localizedPath}"]`);

		await expect(
			directLink.first(),
			`${localizedPath}으로 가는 직접 링크가 소개 화면에 있어야 합니다.`,
		).toHaveAttribute("href", localizedPath);
	}
};

/** 각 단계의 실제 href를 클릭해 고정된 공개 탐색 경로를 검증합니다. */
const followPublicNavigationPath = async ({
	page,
	language,
	paths,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
	paths: readonly string[];
}) => {
	for (const publicPath of paths) {
		const localizedPath = `/${language}${publicPath}`;
		const nextPageLink = page.locator(`a[href="${localizedPath}"]`).first();

		await expect(nextPageLink).toHaveAttribute("href", localizedPath);
		await nextPageLink.click();
		await page.waitForURL(`**${localizedPath}`);
		await assertRenderedPublicPage({ page, language, path: publicPath });
	}
};

/** 공개 화면이 2xx로 열리고 해당 경로의 고유 메타데이터와 본문을 렌더링하는지 검증합니다. */
const assertPublicPage = async ({
	page,
	language,
	path,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
	path: string;
}) => {
	const response = await page.goto(`/${language}${path}`);

	expect(
		response,
		`/${language}${path}의 응답이 있어야 합니다.`,
	).not.toBeNull();
	expect(response?.status()).toBeGreaterThanOrEqual(200);
	expect(response?.status()).toBeLessThan(300);
	await assertRenderedPublicPage({ page, language, path });
};

/** 클릭으로 연 공개 화면의 URL·canonical·고유 본문·브랜드 링크를 검증합니다. */
const assertRenderedPublicPage = async ({
	page,
	language,
	path,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
	path: string;
}) => {
	const localizedPath = `/${language}${path}`;

	expect(new URL(page.url()).pathname).toBe(localizedPath);
	await expect(
		page.locator(`link[rel="canonical"][href$="${localizedPath}"]`),
	).toHaveCount(1);
	await expect(page.locator("h1").first()).toBeVisible();
	await expect(getBrandLink(page)).toHaveAttribute(
		"href",
		`/${language}${PATHS.introduce}`,
	);
};

/** 링크로 방문한 2단계 화면의 HTTP 응답이 2xx인지 별도로 검증합니다. */
const assertPublicResponse = async ({
	page,
	language,
	path,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
	path: string;
}) => {
	const localizedPath = `/${language}${path}`;
	const response = await page.request.get(localizedPath);

	expect(
		response.status(),
		`${localizedPath}은(는) 2xx로 응답해야 합니다.`,
	).toBeGreaterThanOrEqual(200);
	expect(
		response.status(),
		`${localizedPath}은(는) 2xx로 응답해야 합니다.`,
	).toBeLessThan(300);
};

/** noindex 화면의 브랜드 링크가 기존 메모 목적지를 유지하는지 검증합니다. */
const assertNoindexBrandHref = async ({
	page,
	language,
	path,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
	path: string;
}) => {
	const localizedPath = `/${language}${path}`;
	const response = await page.goto(localizedPath);

	expect(response, `${localizedPath}의 응답이 있어야 합니다.`).not.toBeNull();
	expect(response?.status()).toBeGreaterThanOrEqual(200);
	expect(response?.status()).toBeLessThan(300);
	expect(new URL(page.url()).pathname).toBe(localizedPath);
	await expect(getBrandLink(page)).toHaveAttribute(
		"href",
		`/${language}${PATHS.memos}`,
	);
};

/** 헤더의 로고를 포함한 브랜드 링크를 반환합니다. */
const getBrandLink = (page: Page) =>
	page.locator('header a:has(img[alt="logo"])');
