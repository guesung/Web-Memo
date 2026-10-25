import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

test.use({
	storageState: { cookies: [], origins: [] },
});

test.describe("비로그인 설치 가이드", () => {
	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	test("로그인 없이 설치 가이드의 패널 열기 버튼과 세 단계를 볼 수 있다.", async ({
		page,
	}) => {
		const response = await page.goto("/ko/install?ext_cid=install-guide-test");

		expect(response?.status()).toBe(200);
		expect(new URL(page.url()).pathname).toBe("/ko/install");
		expect(new URL(page.url()).searchParams.get("ext_cid")).toBe(
			"install-guide-test",
		);
		await expect(page.locator("main h1")).toBeVisible();
		await expect(page.locator("main ol > li")).toHaveCount(3);
		await expect(
			page.getByRole("button", { name: "사이드 패널 열기" }),
		).toBeVisible();
	});

	test("확장이 패널을 열지 못하면 툴바 아이콘으로 여는 방법을 안내한다.", async ({
		page,
	}) => {
		await page.goto("/ko/install");

		// 웹 E2E 브라우저에는 확장이 없어 패널 열기 요청이 실패한다.
		await expect(page.getByRole("status")).toHaveCount(0);
		await page.getByRole("button", { name: "사이드 패널 열기" }).click();

		await expect(page.getByRole("status")).toContainText("퍼즐 아이콘");
	});

	test("웹 로그인 링크는 설치 유입 ID를 로그인 화면까지 전달한다.", async ({
		page,
	}) => {
		await page.goto("/ko/install?ext_cid=install-guide-test");

		const loginLink = page.locator('main a[href*="/login"]');
		await expect(loginLink).toHaveCount(1);
		await loginLink.click();

		await expect(page).toHaveURL(/\/ko\/login/);
		expect(new URL(page.url()).searchParams.get("ext_cid")).toBe(
			"install-guide-test",
		);
		await expect(page.getByTestId("google-login-button")).toBeVisible();
	});

	test("모바일에서는 미리보기 다음에 세 단계가 세로로 배치된다.", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/ko/install");

		const preview = page.getByRole("img", { name: /미리보기/ });
		const steps = page.locator("main ol");
		await expect(preview).toBeVisible();
		await expect(steps).toBeVisible();

		const previewBox = await preview.boundingBox();
		const stepsBox = await steps.boundingBox();
		if (!previewBox || !stepsBox) {
			throw new Error("설치 가이드의 미리보기와 단계가 표시되어야 합니다.");
		}
		expect(stepsBox.y).toBeGreaterThanOrEqual(previewBox.y + previewBox.height);
	});

	test("데스크톱에서는 미리보기 왼쪽과 세 단계 오른쪽이 나란히 보인다.", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto("/ko/install");

		const preview = page.getByRole("img", { name: /미리보기/ });
		const steps = page.locator("main ol");
		await expect(preview).toBeVisible();
		await expect(steps).toBeVisible();

		const previewBox = await preview.boundingBox();
		const stepsBox = await steps.boundingBox();
		if (!previewBox || !stepsBox) {
			throw new Error("설치 가이드의 미리보기와 단계가 표시되어야 합니다.");
		}
		expect(stepsBox.x).toBeGreaterThanOrEqual(previewBox.x + previewBox.width);
	});
});
