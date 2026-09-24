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

test.describe("카테고리 추천 - 페이지 전환 시 저장", () => {
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

	test("카테고리 추천 중 다른 페이지로 이동해도 원래 페이지의 메모에 카테고리가 적용된다", async ({
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

		// 5. 카테고리 API 응답 반환 (수정된 코드에서는 페이지 A 메모에 저장). 추천이 새 카테고리를 만들 때까지 기다린다.
		const categoryCreateResponse = sidePanelPage.waitForResponse(
			(response) =>
				response.url().includes("/rest/v1/category") &&
				response.request().method() === "POST" &&
				response.ok(),
		);
		resolveCategoryApi();
		await categoryCreateResponse;

		// 6. 페이지 B에 빈 메모가 생성되지 않아야 함
		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

		// 7. 페이지 A로 돌아가서 메모 텍스트가 보존되었는지 확인
		await page.goto(pageAUrl);

		await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
			updatedMemo,
		);
	});

	test("카테고리 추천이 완료되면 원래 페이지의 메모에 카테고리 배지가 표시된다", async ({
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
					},
				}),
			});
		});

		// 3. 메모 수정하여 카테고리 추천 발동
		const updatedMemo = `${memoText} - edited`;
		await sidePanelPage.locator("#memo-textarea").fill(updatedMemo);

		// 4. 카테고리 배지가 표시되어야 함 (추천 응답 → 카테고리 생성 → 메모 수정이 끝나면 뜬다)
		await expect(sidePanelPage.getByText(categoryName)).toBeVisible({
			timeout: 5000,
		});
	});
});
