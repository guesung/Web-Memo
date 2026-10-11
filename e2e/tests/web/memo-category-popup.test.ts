import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockCategory,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 카테고리가 있는 카드와 없는 카드의 제목. */
const CATEGORIZED_TITLE = "카테고리가 있는 메모";
const UNCATEGORIZED_TITLE = "카테고리가 없는 메모";

/** 제목으로 메모 카드를 집는다. */
const getMemoCard = (page: Page, title: string) =>
	page.locator(".memo-item", { hasText: title });

/** 메모 PATCH 요청을 기다려 body를 돌려준다. */
const waitForMemoPatchBody = async (
	page: Page,
	trigger: () => Promise<void>,
) => {
	const requestPromise = page.waitForRequest(
		(request) =>
			request.method() === "PATCH" && request.url().includes("/rest/v1/memo?"),
	);
	await trigger();

	return (await requestPromise).postDataJSON();
};

/** 카드의 ⋮ → "Change category"로 팝업을 연다. */
const openPopupFromOption = async (page: Page, title: string) => {
	await getMemoCard(page, title).getByTestId("memo-option").click();
	await page.getByRole("menuitem", { name: "Change category" }).click();
	await expect(page.getByTestId("category-popover")).toBeVisible();
};

test.describe("웹 메모 카드의 카테고리 팝업 (Mocked)", () => {
	let store: MockSupabaseStore;
	let workCategoryId: number;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		workCategoryId = store.addCategory(createMockCategory({ name: "Work" })).id;
		store.addMemo(
			createMockMemo({
				title: CATEGORIZED_TITLE,
				category_id: workCategoryId,
			}),
		);
		store.addMemo(createMockMemo({ title: UNCATEGORIZED_TITLE }));

		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	// 팝업 목록은 서버에서 내려온 계정의 카테고리라 목 저장소와 별개다. 이름을 하드코딩하지 않고 첫 항목을 쓴다.
	test("⋮ 메뉴에서 열면 검색창에 포커스가 가고, 카테고리를 고르면 저장되며, 다시 열면 그 카테고리에 체크가 붙는다.", async ({
		page,
	}) => {
		await openPopupFromOption(page, UNCATEGORIZED_TITLE);

		const popover = page.getByTestId("category-popover");
		await expect(popover.getByPlaceholder("Search categories")).toBeFocused();
		await expect(popover.getByTestId("category-remove-item")).toHaveCount(0);

		const firstOption = popover.getByRole("option").first();
		const categoryName = (await firstOption.innerText()).trim();
		await popover.getByPlaceholder("Search categories").fill(categoryName);
		await expect(
			popover.getByRole("option", { name: categoryName, exact: true }),
		).toBeVisible();

		const patchBody = await waitForMemoPatchBody(page, () =>
			popover.getByRole("option", { name: categoryName, exact: true }).click(),
		);

		expect(typeof patchBody.category_id).toBe("number");
		await expect(popover).toBeHidden();
		await expect(
			page.getByText("Category changed", { exact: true }),
		).toBeVisible();

		await openPopupFromOption(page, UNCATEGORIZED_TITLE);
		await expect(
			popover
				.getByRole("option", { name: categoryName, exact: true })
				.locator("svg"),
		).toBeVisible();
	});

	test("없는 이름을 입력해 만들면 카테고리를 만든 뒤 그 id로 지정한다.", async ({
		page,
	}) => {
		await openPopupFromOption(page, UNCATEGORIZED_TITLE);

		const popover = page.getByTestId("category-popover");
		await popover.getByPlaceholder("Search categories").fill("Brand New");

		const patchBody = await waitForMemoPatchBody(page, () =>
			popover.getByTestId("category-create-item").click(),
		);

		const createdCategory = store
			.getAllCategories()
			.find((category) => category.name === "Brand New");
		expect(createdCategory).toBeDefined();
		expect(patchBody).toMatchObject({ category_id: createdCategory?.id });
		await expect(popover).toBeHidden();
	});

	test("카테고리 해제는 null로 저장하고, 되돌리기를 누르면 이전 카테고리로 돌아간다.", async ({
		page,
	}) => {
		await openPopupFromOption(page, CATEGORIZED_TITLE);

		const removeBody = await waitForMemoPatchBody(page, () =>
			page.getByTestId("category-remove-item").click(),
		);
		expect(removeBody).toMatchObject({ category_id: null });
		await expect(
			page.getByText("Category removed", { exact: true }),
		).toBeVisible();

		const undoBody = await waitForMemoPatchBody(page, () =>
			page.getByRole("button", { name: "Undo" }).click(),
		);
		expect(undoBody).toMatchObject({ category_id: workCategoryId });
	});

	test("카테고리 없는 카드의 ＋ 칩을 누르면 팝업이 열리고, 카테고리 있는 카드에는 칩이 없다.", async ({
		page,
	}) => {
		await expect(
			getMemoCard(page, CATEGORIZED_TITLE).getByTestId("category-add-chip"),
		).toHaveCount(0);

		await getMemoCard(page, UNCATEGORIZED_TITLE)
			.getByTestId("category-add-chip")
			.click();

		const popover = page.getByTestId("category-popover");
		await expect(popover).toBeVisible();
		await expect(popover.getByTestId("category-remove-item")).toHaveCount(0);
	});

	test("편집 모달에서 Escape를 누르면 팝업만 닫히고 모달은 유지된다. 모달 푸터에는 칩이 없다.", async ({
		page,
	}) => {
		await getMemoCard(page, UNCATEGORIZED_TITLE).click();
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();
		await expect(dialog.getByTestId("category-add-chip")).toHaveCount(0);

		await dialog.getByTestId("memo-option").click();
		await page.getByRole("menuitem", { name: "Change category" }).click();
		const popover = page.getByTestId("category-popover");
		await expect(popover).toBeVisible();

		await page.keyboard.press("Escape");

		await expect(popover).toBeHidden();
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();
	});
});
