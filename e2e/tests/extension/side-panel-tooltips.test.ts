import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 아이콘 전용 컨트롤은 hover하면 누르면 일어날 일을 말풍선으로 알린다. */
test("사이드 패널 아이콘에 마우스를 올리면 의미를 알리는 툴팁이 뜬다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/tooltip-test";
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ url, memo: "툴팁 테스트 메모" }));
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Tooltip test</h1>",
		});
	});
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(url);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"툴팁 테스트 메모",
	);

	const tooltip = sidePanelPage.getByRole("tooltip");
	const expectTooltipOn = async (buttonName: RegExp, text: RegExp) => {
		await sidePanelPage.getByRole("button", { name: buttonName }).hover();
		await expect(tooltip).toHaveText(text);
		await sidePanelPage.mouse.move(0, 0);
		await expect(tooltip).toHaveCount(0);
	};

	await expectTooltipOn(
		/^(Wishlist|위시리스트)$/,
		/^(Add to wishlist|위시리스트에 추가)$/,
	);
	await expectTooltipOn(
		/^(Important|중요 메모)$/,
		/^(Mark as important|중요 메모로 표시)$/,
	);
	await expectTooltipOn(
		/^(Reading|읽는 중)$/,
		/^(Mark as reading|읽는 중으로 표시)$/,
	);
	await expectTooltipOn(
		/^(Open settings|설정 열기)$/,
		/^(Open settings|설정 열기)$/,
	);
	await expectTooltipOn(
		/^(Open in new tab|새 탭에서 열기)$/,
		/^(Open in new tab|새 탭에서 열기)$/,
	);
});
