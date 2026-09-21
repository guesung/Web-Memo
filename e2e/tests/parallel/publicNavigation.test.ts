import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";

/** 공개 탐색 경로를 검증하는 지원 언어입니다. */
const LANGUAGES = ["ko", "en"] as const;

/** 소개 화면에서 두 번 이내의 링크로 도달해야 하는 공개 화면입니다. */
const PUBLIC_DESTINATION_PATHS = [
	PATHS.featuresMemo,
	PATHS.featuresSaveArticles,
	PATHS.featuresYoutubeSummary,
	PATHS.useCasesDeveloper,
	PATHS.useCasesJobHunting,
	PATHS.useCasesLearning,
	PATHS.useCasesNewsReading,
	PATHS.useCasesResearch,
	PATHS.useCasesTechArticle,
	PATHS.useCasesYoutubeNotes,
] as const;

/** 소개 화면에서 허용하는 최대 링크 이동 횟수입니다. */
const MAX_NAVIGATION_DEPTH = 2;

test.describe.configure({ mode: "parallel" });
test.describe("공개 페이지 탐색 경로", () => {
	for (const language of LANGUAGES) {
		test(`${language} 공개 페이지는 같은 언어의 소개 화면으로 연결된다.`, async ({
			page,
		}) => {
			const navigationDepthByPath = await collectPublicNavigationDepths({
				page,
				language,
			});

			for (const destinationPath of PUBLIC_DESTINATION_PATHS) {
				const navigationDepth = navigationDepthByPath.get(destinationPath);

				expect(
					navigationDepth,
					`${destinationPath}은(는) 소개 화면에서 두 번 이내에 도달해야 합니다.`,
				).toBeLessThanOrEqual(MAX_NAVIGATION_DEPTH);
			}

			await assertPublicPage({ page, language, path: PATHS.privacy });
		});

		test(`${language} 도구와 기타 noindex 화면은 기존 메모 링크를 유지한다.`, async ({
			page,
		}) => {
			await assertNoindexBrandHref({ page, language, path: PATHS.login });

			await page.getByTestId("test-login-button").click();
			await page.waitForURL(`**/${language}${PATHS.memos}`);

			await expect(
				page.locator('header a:has(img[alt="logo"])'),
			).toHaveAttribute("href", `/${language}${PATHS.memos}`);
		});
	}
});

/** 소개 화면에서 공개 화면까지의 최소 링크 이동 횟수를 수집합니다. */
const collectPublicNavigationDepths = async ({
	page,
	language,
}: {
	page: Page;
	language: (typeof LANGUAGES)[number];
}) => {
	const navigationDepthByPath = new Map<string, number>([[PATHS.introduce, 0]]);
	const validatedPaths = new Set<string>();
	let currentPaths = [PATHS.introduce];

	for (
		let currentDepth = 0;
		currentDepth < MAX_NAVIGATION_DEPTH;
		currentDepth += 1
	) {
		const nextPaths = new Set<string>();

		for (const currentPath of currentPaths) {
			await assertPublicPage({ page, language, path: currentPath });
			validatedPaths.add(currentPath);
			const linkedPathnames = await page
				.locator("a[href]")
				.evaluateAll((links) =>
					links.map(
						(link) => new URL((link as HTMLAnchorElement).href).pathname,
					),
				);

			for (const destinationPath of PUBLIC_DESTINATION_PATHS) {
				const localizedDestinationPath = `/${language}${destinationPath}`;

				if (
					linkedPathnames.includes(localizedDestinationPath) &&
					!navigationDepthByPath.has(destinationPath)
				) {
					navigationDepthByPath.set(destinationPath, currentDepth + 1);
					nextPaths.add(destinationPath);
				}
			}
		}

		currentPaths = Array.from(nextPaths);
	}

	for (const destinationPath of PUBLIC_DESTINATION_PATHS) {
		if (
			navigationDepthByPath.has(destinationPath) &&
			!validatedPaths.has(destinationPath)
		) {
			await assertPublicPage({ page, language, path: destinationPath });
		}
	}

	return navigationDepthByPath;
};

/** 공개 화면이 404 없이 같은 언어로 열리고, 브랜드가 소개 화면을 가리키는지 검증합니다. */
const assertPublicPage = async ({
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

	expect(
		response?.status(),
		`${localizedPath}에서 404가 발생하면 안 됩니다.`,
	).not.toBe(404);
	expect(new URL(page.url()).pathname).toBe(localizedPath);
	await expect(page.locator('header a:has(img[alt="logo"])')).toHaveAttribute(
		"href",
		`/${language}${PATHS.introduce}`,
	);
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

	expect(
		response?.status(),
		`${localizedPath}에서 404가 발생하면 안 됩니다.`,
	).not.toBe(404);
	expect(new URL(page.url()).pathname).toBe(localizedPath);
	await expect(page.locator('header a:has(img[alt="logo"])')).toHaveAttribute(
		"href",
		`/${language}${PATHS.memos}`,
	);
};
