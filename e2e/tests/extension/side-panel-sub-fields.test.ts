import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 설정에서 켠 느낀 점·액션 아이템은 비어 있으면 + 버튼으로 접히고, 누르면 열린다. */
test("비어 있는 느낀 점·액션 아이템은 접혀 있다가 + 버튼으로 열린다 (Mocked)", async ({
	page,
	context,
}) => {
	const emptyUrl = "https://example.com/sub-fields-empty";
	const filledUrl = "https://example.com/sub-fields-filled";
	const store = new MockSupabaseStore();
	store.setSetting(
		createMockSetting({ show_impression: true, show_action_item: true }),
	);
	store.addMemo(createMockMemo({ url: emptyUrl, memo: "빈 보조 필드 메모" }));
	store.addMemo(
		createMockMemo({
			url: filledUrl,
			memo: "채운 보조 필드 메모",
			impression: "저장된 느낀 점",
		}),
	);
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Sub fields test</h1>",
		});
	});
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	const impression = sidePanelPage.locator("#impression-textarea");
	const actionItem = sidePanelPage.locator("#action-item-textarea");
	const addImpression = sidePanelPage.getByTestId("add-impression-button");
	const addActionItem = sidePanelPage.getByTestId("add-actionItem-button");

	await page.goto(emptyUrl);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"빈 보조 필드 메모",
	);
	await expect(impression).toHaveCount(0);
	await expect(actionItem).toHaveCount(0);
	await expect(addImpression).toBeVisible();
	await expect(addActionItem).toBeVisible();

	await addImpression.click();
	await expect(impression).toBeFocused();
	await expect(addImpression).toHaveCount(0);
	await expect(addActionItem).toBeVisible();

	// 쓰다가 모두 지워도 칸은 닫히지 않는다.
	await impression.fill("잠깐 쓴 느낀 점");
	await impression.fill("");
	await expect(impression).toBeVisible();

	await page.goto(filledUrl);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"채운 보조 필드 메모",
	);
	await expect(impression).toHaveValue("저장된 느낀 점");
	await expect(addImpression).toHaveCount(0);
	await expect(actionItem).toHaveCount(0);
	await expect(addActionItem).toBeVisible();
});
