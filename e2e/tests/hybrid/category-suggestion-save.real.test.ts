import { expect, test } from "../fixtures/extension";
import {
	cleanupTestData,
	createTestNamespace,
	fillMemo,
	findSidePanelPage,
	getRunId,
	login,
	openSidePanel,
	skipGuide,
	waitForSidePanelMemoQuery,
} from "../lib";

test.describe("카테고리 추천 - 새 이름 수락과 페이지 전환", () => {
	// 실제 Supabase에 쓰므로 afterEach에서 지울 대상을 여기 모아 둔다.
	let memoUrls: string[] = [];
	let categoryNames: string[] = [];
	// 메모 URL·카테고리 이름에 실행·테스트 ID를 새겨, 정리가 다른 실행의 행을 건드리지 않게 한다.
	let namespace: ReturnType<typeof createTestNamespace>;

	test.beforeEach(async ({ page }) => {
		memoUrls = [];
		categoryNames = [];
		namespace = createTestNamespace({
			runId: getRunId(),
			testId: test.info().testId,
		});

		await login(page);
		await skipGuide(page);
		await openSidePanel(page);
	});

	test.afterEach(async () => {
		await cleanupTestData({ memoUrls, categoryNames });
	});

	test("카테고리 추천 중 다른 페이지로 이동하면 새 페이지에 적용하지 않는다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		const timestamp = Date.now();
		const pageAUrl = namespace.memoUrl(`a-${timestamp}`);
		memoUrls.push(pageAUrl);
		const pageAMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageAUrl,
		});
		await page.goto(pageAUrl);
		await pageAMemoQuery;

		// 1. 페이지 A에서 메모 작성 (created_at이 생성되도록 저장)
		const memoText = `Test memo ${timestamp}`;
		await fillMemo(sidePanelPage, memoText);

		// 2. 카테고리 API를 지연 응답하도록 모킹
		const categoryName = namespace.categoryName(`Category ${timestamp}`);
		categoryNames.push(categoryName);
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
						source: "llm",
					},
				}),
			});
		});

		// 3. 메모 수정하여 카테고리 추천 발동. 추천 요청이 나가고 디바운스 저장이 끝날 때까지 기다린다.
		const updatedMemo = `${memoText} - updated`;
		const categoryApiRequest = sidePanelPage.waitForRequest(
			"**/api/openai/category",
		);
		await fillMemo(sidePanelPage, updatedMemo);
		await categoryApiRequest;

		// 4. 카테고리 추천 중에 페이지 B로 이동
		const pageBUrl = namespace.memoUrl(`b-page-${timestamp}`);
		memoUrls.push(pageBUrl);
		const pageBMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageBUrl,
		});
		await page.goto(pageBUrl);
		await pageBMemoQuery;

		// 페이지 B에서는 메모가 비어있어야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 5. 카테고리 API 응답을 반환해도 다른 페이지에는 적용하지 않는다.
		resolveCategoryApi();
		// 적용되지 않았음을 확인하려면 응답이 처리될 시간을 줘야 한다.
		await sidePanelPage.waitForTimeout(3000);

		// 6. 페이지 B에 빈 메모가 생성되지 않아야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 7. 페이지 A로 돌아가서 메모 텍스트가 보존되었는지 확인
		await page.goto(pageAUrl);

		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
			updatedMemo,
		);
	});

	test("새 카테고리 이름은 자동 생성하지 않고 수락할 때만 적용한다", async ({
		page,
	}) => {
		const sidePanelPage = await findSidePanelPage(page);

		const timestamp = Date.now();
		const pageAUrl = namespace.memoUrl(`b-${timestamp}`);
		memoUrls.push(pageAUrl);
		const pageAMemoQuery = waitForSidePanelMemoQuery({
			sidePanelPage,
			url: pageAUrl,
		});
		await page.goto(pageAUrl);
		await pageAMemoQuery;

		// 1. 페이지 A에서 메모 작성
		const memoText = `Category badge test ${timestamp}`;
		await fillMemo(sidePanelPage, memoText);

		// 2. 카테고리 API 즉시 응답 모킹 (페이지 전환 없이)
		const categoryName = namespace.categoryName(`Badge ${timestamp}`);
		categoryNames.push(categoryName);
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
						source: "llm",
					},
				}),
			});
		});

		// 3. 메모 수정하여 카테고리 추천 발동
		const updatedMemo = `${memoText} - edited`;
		await sidePanelPage.locator("#memo-textarea").fill(updatedMemo);

		// 4. 추천만 표시되고 카테고리는 아직 생성되지 않는다.
		await expect(
			sidePanelPage.getByTestId("category-suggestion"),
		).toContainText(categoryName, {
			timeout: 5000,
		});
		await expect(sidePanelPage.getByTestId("category-badge")).toHaveCount(0);

		// 5. 수락한 뒤에만 카테고리를 만들고 배지에 적용한다.
		await sidePanelPage.getByTestId("category-suggestion-accept").click();
		await expect(sidePanelPage.getByTestId("category-badge")).toContainText(
			categoryName,
			{
				timeout: 5000,
			},
		);
	});
});
