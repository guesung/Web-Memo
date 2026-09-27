import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 소개 페이지를 검증하는 지원 언어와 마지막 영상 요약 장면의 이름입니다. */
const LANGUAGES = [
	{
		language: "ko",
		summaryTabName: "영상 요약 훑기",
		summaryImageAlt: "영상 옆 패널에 요약과 직접 쓴 메모가 표시된 화면",
	},
	{
		language: "en",
		summaryTabName: "Scan a video summary",
		summaryImageAlt:
			"A video with a summary and a written note in the side panel",
	},
] as const;

/** 데모 슬라이드 이미지 수입니다. */
const DEMO_IMAGE_COUNT = 5;

// 비로그인 상태의 화면을 검증하므로 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("소개 페이지 데모 캐러셀", () => {
	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	for (const { language, summaryTabName, summaryImageAlt } of LANGUAGES) {
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

			const summaryTab = carousel.getByRole("button", {
				name: summaryTabName,
			});
			await summaryTab.click();
			await expect(summaryTab).toHaveAttribute("aria-pressed", "true");

			const nextImage = carousel.locator(`img[alt="${summaryImageAlt}"]`);
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

	test("영상 출처 링크에 포커스가 있으면 자동 전환 중에도 링크가 유지된다.", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);

		const carousel = page.locator('section[aria-roledescription="carousel"]');
		const summaryTab = carousel.getByRole("button", {
			name: "영상 요약 훑기",
		});
		await summaryTab.click();

		const licenseLink = carousel.getByRole("link", { name: "CC BY 3.0" });
		await licenseLink.focus();
		await page.waitForTimeout(9000);

		await expect(summaryTab).toHaveAttribute("aria-pressed", "true");
		await expect(licenseLink).toBeFocused();
	});
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
