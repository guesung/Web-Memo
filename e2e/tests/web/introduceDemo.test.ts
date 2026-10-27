import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 소개 페이지를 검증하는 지원 언어와 마지막 카테고리 장면의 이름입니다. */
const LANGUAGES = [
	{
		language: "ko",
		categoryTabName: "카테고리로 정리",
		categoryImageAlt:
			"웹 대시보드에서 카테고리를 선택해 해당 메모를 모아 보는 화면",
	},
	{
		language: "en",
		categoryTabName: "Organize by category",
		categoryImageAlt:
			"The web dashboard showing notes filtered by a selected category",
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

	for (const { language, categoryTabName, categoryImageAlt } of LANGUAGES) {
		test(`${language} 랜딩은 Hero 이미지만 미리 받고 반응형 크기를 제공한다.`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);

			const heroImage = page.locator("section").first().locator("img");
			await expect(heroImage).toHaveAttribute("srcset", /_next\/image/);
			await expect(heroImage).toHaveAttribute("sizes", /548px/);
			await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(
				1,
			);
			await expect(
				page.locator('link[rel="preload"][href*="googletagmanager"]'),
			).toHaveCount(0);
		});

		test(`${language} 소개 문구와 설치 링크가 현재 제공 상태에 맞다.`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);

			const isKorean = language === "ko";
			const heroTitle = isKorean
				? "글 읽으며 메모하세요"
				: "Take notes while reading";
			const heroSubtitle = isKorean
				? "글을 읽다가 떠오른 생각을 사이드 패널에 적어요.\n페이지 제목과 주소는 자동으로 기록됩니다."
				: "Write down thoughts in the side panel as you read.\nThe page title and URL are saved automatically.";
			const demoTitle = isKorean ? "웹 메모 미리 보기" : "Preview Web Memo";
			const sidePanelTab = isKorean ? "사이드 패널" : "Side panel";

			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				heroTitle,
			);
			await expect(page.locator("h1 + p")).toHaveText(heroSubtitle);
			await expect(page.locator("h1 + p")).toHaveCSS("white-space", "pre-line");
			await expect(page.locator("#demo h2")).toHaveText(demoTitle);
			await expect(
				page.locator("#demo").getByRole("button", { name: sidePanelTab }),
			).toBeVisible();
			await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);
		});

		test(`${language} 탭을 누르면 최적화된 슬라이드 이미지가 표시된다.`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);

			const carousel = page.locator('section[aria-roledescription="carousel"]');
			const images = carousel.locator("img");

			await carousel.scrollIntoViewIfNeeded();
			await expect(images).toHaveCount(DEMO_IMAGE_COUNT);
			await expect(images.first()).toHaveAttribute("srcset", /_next\/image/);
			await expect(images.first()).toHaveAttribute("sizes", /1152px/);

			const previousActiveImage = carousel.locator(
				'div:not([aria-hidden="true"]) > img',
			);
			const previousAlt = await previousActiveImage.getAttribute("alt");

			const categoryTab = carousel.getByRole("button", {
				name: categoryTabName,
			});
			await categoryTab.click();
			await expect(categoryTab).toHaveAttribute("aria-pressed", "true");

			const nextImage = carousel.locator(`img[alt="${categoryImageAlt}"]`);
			const nextSlide = nextImage.locator("..");

			await expect(nextSlide).not.toHaveAttribute("aria-hidden", "true");
			await expect
				.poll(() =>
					nextImage.evaluate((image: HTMLImageElement) => image.naturalWidth),
				)
				.toBeGreaterThan(0);
			await expect(
				carousel.locator(`img[alt="${previousAlt}"]`).locator(".."),
			).toHaveAttribute("aria-hidden", "true");
		});
	}

	test("데모 탭에 포커스가 있으면 자동 전환 중에도 선택한 장면을 유지한다.", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);

		const carousel = page.locator('section[aria-roledescription="carousel"]');
		const categoryTab = carousel.getByRole("button", {
			name: "카테고리로 정리",
		});
		await categoryTab.click();

		await categoryTab.focus();
		await page.waitForTimeout(9000);

		await expect(categoryTab).toHaveAttribute("aria-pressed", "true");
		await expect(categoryTab).toBeFocused();
	});
});
