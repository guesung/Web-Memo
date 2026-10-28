import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockCategory,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 팝업의 캐시에는 없지만 서버에는 이미 있는 이름이면, 만들지 않고 그 카테고리를 지정한다. */
test("캐시에 없는 기존 카테고리 이름으로 만들기를 누르면 POST 없이 기존 카테고리가 지정된다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/side-panel-category-create";
	const store = new MockSupabaseStore();
	store.addCategory(createMockCategory({ name: "Work" }));
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Category create test</h1>",
		});
	});
	const categoryPostRequests: string[] = [];
	context.on("request", (request) => {
		if (
			request.method() === "POST" &&
			request.url().includes("/rest/v1/category")
		) {
			categoryPostRequests.push(request.url());
		}
	});

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(url);

	const chip = sidePanelPage.getByTestId("category-add-chip");
	await expect(chip).toBeEnabled();
	await chip.click();
	const popup = sidePanelPage.getByTestId("category-popup");
	await expect(popup.getByRole("option", { name: "Work" })).toBeVisible();

	// 팝업이 열린 뒤 다른 곳(웹)에서 카테고리가 생긴 상황. 사이드 패널 캐시는 아직 모른다.
	const serverCategory = store.addCategory(
		createMockCategory({ name: "Reading" }),
	);
	await popup.getByRole("combobox").fill("reading");
	await popup.getByTestId("category-create-item").click();

	const badge = sidePanelPage.getByTestId("category-badge");
	await expect(badge).toContainText(serverCategory.name);
	expect(categoryPostRequests).toHaveLength(0);
});
