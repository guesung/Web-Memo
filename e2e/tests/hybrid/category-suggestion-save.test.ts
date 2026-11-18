import { expect, test } from "../fixtures/extension";
import {
	fillMemo,
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
	waitForSidePanelMemoQuery,
} from "../lib";
import {
	createMockCategory,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** Jev가 추천으로 돌려줄 기존 카테고리의 이름. */
const CATEGORY_NAME = "Jev suggestion";
/** 테스트가 방문하는 페이지의 뿌리. 실제 사이트로 나가지 않게 빈 문서로 응답한다. */
const PAGE_URL_ROOT = "https://example.com/category-suggestion";

test.describe("카테고리 추천 - Jev 제안 수락과 페이지 전환", () => {
	let categoryId: number;

	test.beforeEach(async ({ page, context }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		categoryId = store.addCategory(
			createMockCategory({ name: CATEGORY_NAME }),
		).id;
		await setupSupabaseMocks(page, store);
		await context.route("https://example.com/**", async (route) => {
			await route.fulfill({
				contentType: "text/html",
				body: "<h1>Category suggestion test</h1>",
			});
		});

		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
	});

	test("카테고리 추천 중 다른 페이지로 이동하면 새 페이지에 적용하지 않는다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		const pageAUrl = `${PAGE_URL_ROOT}/moving-a`;
		const pageAMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageAUrl,
		});
		await page.goto(pageAUrl);
		await pageAMemoQuery;

		// 1. 첫 메모 입력에서 시작하는 카테고리 API를 지연 응답하도록 모킹
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
						categoryName: CATEGORY_NAME,
						isExisting: true,
						existingCategoryId: categoryId,
						confidence: 0.2,
						source: "jev",
					},
				}),
			});
		});

		// 2. 첫 입력을 저장하면 추천 요청이 한 번 시작된다.
		const memoText = "Test memo";
		const categoryApiRequest = sidePanelPage.waitForRequest(
			"**/api/openai/category",
		);
		await fillMemo(sidePanelPage, memoText);
		await categoryApiRequest;
		await expect(
			sidePanelPage.getByTestId("category-suggesting"),
		).toBeVisible();

		// 3. 카테고리 추천 중에 페이지 B로 이동
		const pageBUrl = `${PAGE_URL_ROOT}/moving-b`;
		const pageBMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageBUrl,
		});
		await page.goto(pageBUrl);
		await pageBMemoQuery;

		// 페이지 B에서는 메모가 비어있어야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 4. 카테고리 API 응답을 반환해도 다른 페이지에는 적용하지 않는다.
		resolveCategoryApi();
		// 적용되지 않았음을 확인하려면 응답이 처리될 시간을 줘야 한다.
		await sidePanelPage.waitForTimeout(3000);

		// 5. 페이지 B에 빈 메모가 생성되지 않아야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 6. 페이지 A로 돌아가서 메모 텍스트가 보존되었는지 확인
		await page.goto(pageAUrl);

		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(memoText);
	});

	test("Jev가 고른 기존 카테고리는 수락할 때만 적용한다", async ({ page }) => {
		const sidePanelPage = await findSidePanelPage(page);

		const pageAUrl = `${PAGE_URL_ROOT}/accept`;
		const pageAMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageAUrl,
		});
		await page.goto(pageAUrl);
		await pageAMemoQuery;

		// 1. 카테고리 API 즉시 응답 모킹 (페이지 전환 없이)
		let categoryRequestCount = 0;
		await sidePanelPage.route("**/api/openai/category", async (route) => {
			categoryRequestCount += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					suggestion: {
						categoryName: CATEGORY_NAME,
						isExisting: true,
						existingCategoryId: categoryId,
						confidence: 0.2,
						source: "jev",
					},
				}),
			});
		});

		// 2. 첫 메모 입력을 저장하면 카테고리 추천이 시작된다.
		const memoText = "Category badge test";
		await fillMemo(sidePanelPage, memoText);

		// 3. 추천만 표시되고 카테고리는 자동 적용되지 않는다.
		await expect(
			sidePanelPage.getByTestId("category-suggestion"),
		).toContainText(CATEGORY_NAME, {
			timeout: 5000,
		});
		await expect(sidePanelPage.getByTestId("category-badge")).toHaveCount(0);

		// 4. 수락한 뒤에만 배지에 적용한다.
		await sidePanelPage.getByTestId("category-suggestion-accept").click();
		await expect(sidePanelPage.getByTestId("category-badge")).toContainText(
			CATEGORY_NAME,
			{
				timeout: 5000,
			},
		);

		// 5. 카테고리를 제거하고 메모를 더 입력하면 다시 추천한다.
		await sidePanelPage
			.getByTestId("category-badge")
			.locator("button")
			.last()
			.click();
		await expect(sidePanelPage.getByTestId("category-badge")).toHaveCount(0);
		await fillMemo(sidePanelPage, `${memoText} updated`);
		await expect(
			sidePanelPage.getByTestId("category-suggestion"),
		).toContainText(CATEGORY_NAME);
		expect(categoryRequestCount).toBe(2);
	});

	test("메모 입력에 포커스가 있어도 Cmd/Ctrl+Enter로 추천을 수락한다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		const pageUrl = `${PAGE_URL_ROOT}/shortcut`;
		const pageMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageUrl,
		});
		await page.goto(pageUrl);
		await pageMemoQuery;

		await sidePanelPage.route("**/api/openai/category", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					suggestion: {
						categoryName: CATEGORY_NAME,
						isExisting: true,
						existingCategoryId: categoryId,
						confidence: 0.2,
						source: "jev",
					},
				}),
			});
		});

		const memoText = "Shortcut accept test";
		await fillMemo(sidePanelPage, memoText);
		await expect(
			sidePanelPage.getByTestId("category-suggestion"),
		).toContainText(CATEGORY_NAME, { timeout: 5000 });

		// 단축키로 수락해도 textarea에 줄바꿈이 들어가지 않는다.
		await sidePanelPage.locator("#memo-textarea").focus();
		await sidePanelPage.keyboard.press("ControlOrMeta+Enter");
		await expect(sidePanelPage.getByTestId("category-badge")).toContainText(
			CATEGORY_NAME,
			{ timeout: 5000 },
		);
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(memoText);
	});
});
