import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

const LANGUAGES = [
	{
		language: "ko",
		step: "저장 완료",
		caption: "입력 내용이 자동 저장됩니다.",
		title: "좋은 생각은 읽는 동안 떠오른다",
		heroTitle: "글 읽으며 메모하세요",
		heroSubtitle:
			"글을 읽다가 떠오른 생각을 사이드 패널에 적어요.\n페이지 제목과 주소는 자동으로 기록됩니다.",
		demoTitle: "웹 메모 미리 보기",
		panelStep: "패널 열기",
	},
	{
		language: "en",
		step: "Saved",
		caption: "Your memo is saved automatically.",
		title: "Good ideas arrive while you read",
		heroTitle: "Take notes while reading",
		heroSubtitle:
			"Write down thoughts in the side panel as you read.\nThe page title and URL are saved automatically.",
		demoTitle: "Preview Web Memo",
		panelStep: "Open panel",
	},
] as const;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("소개 페이지 메모 사용 흐름 데모", () => {
	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	for (const {
		language,
		step,
		caption,
		title,
		heroTitle,
		heroSubtitle,
		demoTitle,
		panelStep,
	} of LANGUAGES) {
		test(`${language} 소개 문구와 설치 링크가 현재 제공 상태에 맞다`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				heroTitle,
			);
			await expect(page.locator("h1 + p")).toHaveText(heroSubtitle);
			await expect(page.locator("h1 + p")).toHaveCSS("white-space", "pre-line");
			await expect(page.locator("#demo h2")).toHaveText(demoTitle);
			await expect(
				page.locator("#demo").getByRole("button", { name: panelStep }),
			).toBeVisible();
			await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);
		});
		test(`${language} 단계 버튼으로 자동 저장 장면을 볼 수 있다`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);
			const demo = page.locator("#demo");
			await expect(demo.getByText(title).first()).toBeVisible();
			await demo.getByRole("button", { name: step }).click();
			await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
				"data-stage",
				"4",
			);
			await expect(demo.getByText(caption)).toBeVisible();
			await expect(demo.getByTestId("demo-saved")).toBeAttached();
		});
	}

	test("동작 줄이기 설정에서는 자동 전환하지 않고 단계 조작이 가능하다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		await expect(demo.getByRole("button", { name: "재생" })).toBeDisabled();
		await page.waitForTimeout(3200);
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"0",
		);
		await demo.getByRole("button", { name: "메모 입력" }).click();
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"3",
		);
	});

	test("사용자가 정지하면 포인터와 포커스가 떠나도 장면이 유지된다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		await demo.getByRole("button", { name: "패널 열기" }).click();
		await demo.getByRole("button", { name: "재생" }).click();
		await demo.getByRole("button", { name: "정지" }).click();
		await page.mouse.move(0, 0);
		await page.keyboard.press("Tab");
		await page.waitForTimeout(3200);
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"2",
		);
	});
	test("자동 재생은 hover와 focus 동안 멈추고 벗어나면 이어진다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		const scene = demo.getByTestId("demo-scene");
		await demo.getByRole("button", { name: "글 읽기" }).click();
		await demo.getByRole("button", { name: "재생" }).click();
		await demo
			.getByRole("button", { name: "정지" })
			.evaluate((button: HTMLElement) => button.blur());
		await page.mouse.move(0, 0);
		await expect(scene).toHaveAttribute("data-stage", "1", { timeout: 5000 });
		await demo.hover();
		await page.waitForTimeout(2100);
		await expect(scene).toHaveAttribute("data-stage", "1");
		await page.mouse.move(0, 0);
		await expect(scene).toHaveAttribute("data-stage", "2", { timeout: 4000 });
		await demo.getByRole("button", { name: "패널 열기" }).focus();
		await page.waitForTimeout(3100);
		await expect(scene).toHaveAttribute("data-stage", "2");
		await demo
			.getByRole("button", { name: "패널 열기" })
			.evaluate((button: HTMLElement) => button.blur());
		await expect(scene).toHaveAttribute("data-stage", "3", { timeout: 4000 });
	});
});
