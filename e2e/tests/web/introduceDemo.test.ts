import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 소개 페이지를 검증하는 지원 언어와 그 언어의 AI 요약 탭 이름입니다. */
const LANGUAGES = [
	{ language: "ko", aiTabName: "AI 요약" },
	{ language: "en", aiTabName: "AI Summary" },
] as const;

/** 데모 슬라이드 이미지 수입니다. */
const DEMO_IMAGE_COUNT = 5;

// 비로그인 상태의 화면을 검증하므로 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("소개 페이지 데모 캐러셀", () => {
	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	for (const { language, aiTabName } of LANGUAGES) {
		test(`${language} 탭을 눌러도 슬라이드 이미지가 이미 로드되어 있다.`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);

			const carousel = page.locator('section[aria-roledescription="carousel"]');
			const images = carousel.locator("img");

			await carousel.scrollIntoViewIfNeeded();
			await expect(images).toHaveCount(DEMO_IMAGE_COUNT);
			await expectAllImagesLoaded(images);

			const previousActiveImage = carousel.locator(
				'div:not([aria-hidden="true"]) > img',
			);
			const previousAlt = await previousActiveImage.getAttribute("alt");

			await carousel.getByRole("button", { name: aiTabName }).click();

			const nextImage = carousel.locator(`img[alt="${aiTabName}"]`);
			const nextSlide = nextImage.locator("..");

			await expect(nextSlide).not.toHaveAttribute("aria-hidden", "true");
			expect(
				await nextImage.evaluate(
					(image: HTMLImageElement) => image.naturalWidth,
				),
			).toBeGreaterThan(0);
			await expect(
				carousel.locator(`img[alt="${previousAlt}"]`).locator(".."),
			).toHaveAttribute("aria-hidden", "true");
		});
	}
});

/** 모든 데모 이미지의 디코딩된 너비가 0보다 클 때까지 기다립니다. */
const expectAllImagesLoaded = async (
	images: ReturnType<Page["locator"]>,
): Promise<void> => {
	await expect
		.poll(() =>
			images.evaluateAll((elements) =>
				elements.every(
					(element) => (element as HTMLImageElement).naturalWidth > 0,
				),
			),
		)
		.toBe(true);
};
