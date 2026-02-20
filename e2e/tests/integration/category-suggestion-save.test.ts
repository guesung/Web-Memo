import { expect, test } from "../fixtures";
import {
	fillMemo,
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
} from "../lib";

test.describe("카테고리 추천 - 페이지 전환 시 저장", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
	});

	test("카테고리 추천 중 다른 페이지로 이동해도 원래 페이지의 메모에 카테고리가 적용된다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		const timestamp = Date.now();
		const pageAUrl = `https://example.com/test-a-${timestamp}`;
		await page.goto(pageAUrl);
		await sidePanelPage.waitForTimeout(1000);

		// 1. 페이지 A에서 메모 작성 (created_at이 생성되도록 저장)
		const memoText = `Test memo ${timestamp}`;
		await fillMemo(sidePanelPage, memoText);
		await sidePanelPage.waitForTimeout(1000);

		// 2. 카테고리 API를 지연 응답하도록 모킹
		const categoryName = `E2E Category ${timestamp}`;
		let resolveCategoryApi!: () => void;
		const categoryApiGate = new Promise<void>((resolve) => {
			resolveCategoryApi = resolve;
		});

		await sidePanelPage.route("**/api/openai/category", async (route) => {
			await categoryApiGate;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					suggestion: {
						categoryName,
						isExisting: false,
						existingCategoryId: null,
						confidence: 0.9,
					},
				}),
			});
		});

		// 3. 메모 수정하여 카테고리 추천 발동 (디바운스 저장도 대기)
		const updatedMemo = `${memoText} - updated`;
		const memoSavePromise = sidePanelPage
			.waitForResponse(
				(response) => response.url().includes("/rest/v1/memo") && response.ok(),
				{ timeout: 5000 },
			)
			.catch(() => {});

		await sidePanelPage.locator("#memo-textarea").fill(updatedMemo);
		await memoSavePromise;
		await sidePanelPage.waitForTimeout(500);

		// 4. 카테고리 추천 중에 페이지 B로 이동
		const pageBUrl = `https://httpbin.org/get?t=${timestamp}`;
		await page.goto(pageBUrl);
		await sidePanelPage.waitForTimeout(1000);

		// 페이지 B에서는 메모가 비어있어야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 5. 카테고리 API 응답 반환 (수정된 코드에서는 페이지 A 메모에 저장)
		resolveCategoryApi();
		await sidePanelPage.waitForTimeout(3000);

		// 6. 페이지 B에 빈 메모가 생성되지 않아야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 7. 페이지 A로 돌아가서 메모 텍스트가 보존되었는지 확인
		await page.goto(pageAUrl);
		await sidePanelPage.waitForTimeout(2000);

		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
			updatedMemo,
		);
	});

	test("카테고리 추천이 완료되면 원래 페이지의 메모에 카테고리 배지가 표시된다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		const timestamp = Date.now();
		const pageAUrl = `https://example.com/test-b-${timestamp}`;
		await page.goto(pageAUrl);
		await sidePanelPage.waitForTimeout(1000);

		// 1. 페이지 A에서 메모 작성
		const memoText = `Category badge test ${timestamp}`;
		await fillMemo(sidePanelPage, memoText);
		await sidePanelPage.waitForTimeout(1000);

		// 2. 카테고리 API 즉시 응답 모킹 (페이지 전환 없이)
		const categoryName = `Badge Test ${timestamp}`;
		await sidePanelPage.route("**/api/openai/category", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					suggestion: {
						categoryName,
						isExisting: false,
						existingCategoryId: null,
						confidence: 0.9,
					},
				}),
			});
		});

		// 3. 메모 수정하여 카테고리 추천 발동
		const updatedMemo = `${memoText} - edited`;
		await sidePanelPage.locator("#memo-textarea").fill(updatedMemo);
		await sidePanelPage.waitForTimeout(3000);

		// 4. 카테고리 배지가 표시되어야 함
		await expect(sidePanelPage.getByText(categoryName)).toBeVisible({
			timeout: 5000,
		});
	});
});
