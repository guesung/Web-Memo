import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const MULTI_MEMO_URL = "https://example.com/multi-memo";

const LIST_BUTTON_NAME = /이 페이지 메모 목록|Memos on this page/i;
const NEW_MEMO_BUTTON_NAME = /^(새 메모|New memo)$/;

const getPageMemos = (store: MockSupabaseStore) =>
	store.getAllMemos().filter((memo) => memo.url === MULTI_MEMO_URL);

/** 같은 URL에 메모 두 개를 둔다. 먼저 만든 `recentMemo`가 더 최근에 수정된 메모다. */
const setupTwoMemoPage = async ({
	page,
	context,
}: {
	page: Page;
	context: BrowserContext;
}) => {
	const store = new MockSupabaseStore();
	const recentMemo = store.addMemo(
		createMockMemo({
			url: MULTI_MEMO_URL,
			title: "최근 메모",
			memo: "최근 메모 본문",
			updated_at: "2026-11-01T10:00:00.000Z",
		}),
	);
	const olderMemo = store.addMemo(
		createMockMemo({
			url: MULTI_MEMO_URL,
			title: "오래된 메모",
			memo: "오래된 메모 본문",
			updated_at: "2026-10-01T10:00:00.000Z",
		}),
	);
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Multi memo test</h1>",
		});
	});

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(MULTI_MEMO_URL);

	return { store, recentMemo, olderMemo, sidePanelPage };
};

test("메모가 여러 개인 페이지에서 패널을 열면 최근 수정한 메모가 바로 편집된다", async ({
	page,
	context,
}) => {
	const { sidePanelPage } = await setupTwoMemoPage({ page, context });

	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"최근 메모 본문",
	);
	const listButton = sidePanelPage.getByRole("button", {
		name: LIST_BUTTON_NAME,
	});
	await expect(listButton).toBeVisible();
	await expect(listButton).toHaveText("2");
	await expect(
		sidePanelPage.getByRole("button", { name: NEW_MEMO_BUTTON_NAME }),
	).toBeVisible();
});

test("새 메모 버튼으로 같은 페이지에 메모를 더 쓰면 첫 저장은 insert 한 번, 이후는 update다", async ({
	page,
	context,
}) => {
	const { store, recentMemo, olderMemo, sidePanelPage } =
		await setupTwoMemoPage({ page, context });
	const memoWrites: string[] = [];
	context.on("request", (request) => {
		if (
			request.method() !== "GET" &&
			/\/rest\/v1\/memo(\?|$)/.test(request.url())
		) {
			memoWrites.push(request.method());
		}
	});

	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"최근 메모 본문",
	);
	await sidePanelPage
		.getByRole("button", { name: NEW_MEMO_BUTTON_NAME })
		.click();
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue("");

	await sidePanelPage.locator("#memo-textarea").fill("세 번째 메모");
	await expect.poll(() => getPageMemos(store).length).toBe(3);

	await sidePanelPage.locator("#memo-textarea").fill("세 번째 메모 수정");
	await expect
		.poll(() =>
			getPageMemos(store).some((memo) => memo.memo === "세 번째 메모 수정"),
		)
		.toBe(true);

	expect(memoWrites.filter((method) => method === "POST")).toHaveLength(1);
	expect(getPageMemos(store)).toHaveLength(3);
	expect(store.getMemo(recentMemo.id)?.memo).toBe("최근 메모 본문");
	expect(store.getMemo(olderMemo.id)?.memo).toBe("오래된 메모 본문");
});

test("A와 B를 오가며 고쳐도 두 메모 내용이 섞이지 않고 모두 저장된다", async ({
	page,
	context,
}) => {
	const { store, recentMemo, olderMemo, sidePanelPage } =
		await setupTwoMemoPage({ page, context });
	const textarea = sidePanelPage.locator("#memo-textarea");
	const listButton = sidePanelPage.getByRole("button", {
		name: LIST_BUTTON_NAME,
	});

	await expect(textarea).toHaveValue("최근 메모 본문");
	await textarea.fill("A 수정됨");
	await listButton.click();
	await sidePanelPage.getByRole("button", { name: /오래된 메모 본문/ }).click();
	await expect(textarea).toHaveValue("오래된 메모 본문");

	await textarea.fill("B 수정됨");
	await listButton.click();

	await expect.poll(() => store.getMemo(recentMemo.id)?.memo).toBe("A 수정됨");
	await expect.poll(() => store.getMemo(olderMemo.id)?.memo).toBe("B 수정됨");
	expect(getPageMemos(store)).toHaveLength(2);
});

test("목록 화면은 메모 개수 제목과 편집 중 표시를 보여 주고 목록 버튼으로 편집하던 메모에 돌아간다", async ({
	page,
	context,
}) => {
	const { sidePanelPage } = await setupTwoMemoPage({ page, context });
	const textarea = sidePanelPage.locator("#memo-textarea");
	const listButton = sidePanelPage.getByRole("button", {
		name: LIST_BUTTON_NAME,
	});

	await expect(textarea).toHaveValue("최근 메모 본문");
	await listButton.click();

	await expect(listButton).toHaveAttribute("aria-pressed", "true");
	await expect(
		sidePanelPage.getByText(/이 페이지 메모 2개|2 memos on this page/),
	).toBeVisible();
	await expect(
		sidePanelPage.getByRole("button", {
			name: /새 메모 작성|Write a new memo/,
		}),
	).toBeVisible();
	await expect(sidePanelPage.getByText(/· 편집 중|· Editing/)).toHaveCount(1);

	await listButton.click();
	await expect(textarea).toHaveValue("최근 메모 본문");
});
