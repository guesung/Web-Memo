import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const MEMO_URL = "https://example.com/delete-undo";
const LIST_BUTTON_NAME = /이 페이지 메모 목록|Memos on this page/i;
const DELETE_BUTTON_NAME = /메모 삭제|Delete memo/i;
const UNDO_BUTTON_NAME = /되돌리기|Undo/i;

const setupMemoPage = async ({
	page,
	context,
	store,
}: {
	page: Page;
	context: BrowserContext;
	store: MockSupabaseStore;
}) => {
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Delete and undo test</h1>",
		});
	});

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(MEMO_URL);

	return sidePanelPage;
};

const deleteMemoFromList = async (sidePanelPage: Page, content: string) => {
	const memoRow = sidePanelPage
		.getByRole("button", { name: new RegExp(content) })
		.locator("..");
	await memoRow.getByRole("button", { name: DELETE_BUTTON_NAME }).click();
};

test("선택한 메모를 삭제하면 다른 메모로 돌아가고, 되돌리면 원래 내용이 복원된다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	const recentMemo = store.addMemo(
		createMockMemo({
			url: MEMO_URL,
			title: "최근 메모",
			memo: "최근 메모 본문",
			updated_at: "2026-11-01T10:00:00.000Z",
		}),
	);
	const olderMemo = store.addMemo(
		createMockMemo({
			url: MEMO_URL,
			title: "오래된 메모",
			memo: "오래된 메모 본문",
			updated_at: "2026-10-01T10:00:00.000Z",
		}),
	);
	const sidePanelPage = await setupMemoPage({ page, context, store });
	const textarea = sidePanelPage.locator("#memo-textarea");
	const listButton = sidePanelPage.getByRole("button", {
		name: LIST_BUTTON_NAME,
	});

	await expect(textarea).toHaveValue(recentMemo.memo);
	await listButton.click();
	await deleteMemoFromList(sidePanelPage, recentMemo.memo);

	await expect
		.poll(() => store.getMemo(recentMemo.id)?.deleted_at)
		.toEqual(expect.any(String));
	await expect(listButton).toHaveText("1");
	await expect(
		sidePanelPage.getByText(/이 페이지 메모 1개|1 memos on this page/),
	).toBeVisible();
	await expect(
		sidePanelPage.getByRole("button", { name: /최근 메모 본문/ }),
	).toHaveCount(0);
	await expect(
		sidePanelPage.getByRole("button", { name: /오래된 메모 본문/ }),
	).toBeVisible();

	await listButton.click();
	await expect(textarea).toHaveValue(olderMemo.memo);
	await expect(store.getMemo(olderMemo.id)?.deleted_at).toBeNull();

	await sidePanelPage.getByRole("button", { name: UNDO_BUTTON_NAME }).click();
	await expect.poll(() => store.getMemo(recentMemo.id)?.deleted_at).toBeNull();
	await expect(listButton).toHaveText("2");
	await listButton.click();
	await expect(
		sidePanelPage.getByRole("button", { name: /최근 메모 본문/ }),
	).toBeVisible();
	await sidePanelPage.getByRole("button", { name: /최근 메모 본문/ }).click();
	await expect(textarea).toHaveValue(recentMemo.memo);
	await expect(store.getMemo(olderMemo.id)?.memo).toBe(olderMemo.memo);
});

test("마지막 메모를 삭제하면 빈 목록이 보이고, 되돌리면 다시 선택할 수 있다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	const memo = store.addMemo(
		createMockMemo({
			url: MEMO_URL,
			title: "유일한 메모",
			memo: "유일한 메모 본문",
		}),
	);
	const sidePanelPage = await setupMemoPage({ page, context, store });
	const textarea = sidePanelPage.locator("#memo-textarea");
	const listButton = sidePanelPage.getByRole("button", {
		name: LIST_BUTTON_NAME,
	});

	await expect(textarea).toHaveValue(memo.memo);
	await listButton.click();
	await deleteMemoFromList(sidePanelPage, memo.memo);

	await expect
		.poll(() => store.getMemo(memo.id)?.deleted_at)
		.toEqual(expect.any(String));
	await expect(listButton).toHaveCount(0);
	await expect(
		sidePanelPage.getByText(
			/이 페이지에 아직 메모가 없어요|No memos on this page yet/,
		),
	).toBeVisible();
	await expect(
		sidePanelPage.getByRole("button", { name: /유일한 메모 본문/ }),
	).toHaveCount(0);

	await sidePanelPage.getByRole("button", { name: UNDO_BUTTON_NAME }).click();
	await expect.poll(() => store.getMemo(memo.id)?.deleted_at).toBeNull();
	await expect(listButton).toHaveText("1");
	await sidePanelPage.getByRole("button", { name: /유일한 메모 본문/ }).click();
	await expect(textarea).toHaveValue(memo.memo);
});
