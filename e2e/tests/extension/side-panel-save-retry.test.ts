import { SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import {
	findSidePanelPage,
	getMemoQueryPageKeys,
	login,
	openSidePanel,
	skipGuide,
	waitForSidePanelMemoQuery,
} from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const SAVE_URL = "https://example.com/online-save-retry";
const CANDIDATE_URL = "https://example.com/candidate-load-retry";

test("온라인 자동 저장이 서버 오류로 실패해도 입력을 유지하고 재시도는 메모 한 건만 만든다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<h1>Memo retry</h1>" }),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	const memoQueryResponse = waitForSidePanelMemoQuery({
		sidePanelPage: panel,
		url: SAVE_URL,
	});
	await page.goto(SAVE_URL);
	await memoQueryResponse;
	const textarea = panel.locator("#memo-textarea");
	await expect(textarea).toHaveValue("");
	await expect(textarea).toBeEditable();

	let insertCount = 0;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() !== "POST") {
			await route.fallback();
			return;
		}
		insertCount += 1;
		if (insertCount === 1) {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ message: "injected save failure" }),
			});
			return;
		}
		await route.fallback();
	});

	const draft = "서버 오류 후에도 남는 새 메모";
	await textarea.fill(draft);
	await expect(panel.locator('[data-save-status="failed"]')).toBeVisible();
	await expect(textarea).toHaveValue(draft);
	expect(
		store.getAllMemos().filter((memo) => memo.url === SAVE_URL),
	).toHaveLength(0);
	await panel
		.locator('[data-save-status="failed"]')
		.getByRole("button", { name: /retry|다시 시도/i })
		.click();

	await expect(panel.locator('[data-save-status="saved"]')).toBeVisible();
	await expect(textarea).toHaveValue(draft);
	await expect
		.poll(() => store.getAllMemos().filter((memo) => memo.url === SAVE_URL))
		.toHaveLength(1);
	expect(store.getMemoByUrl(SAVE_URL)?.memo).toBe(draft);
	expect(insertCount).toBe(2);
});

test("현재 URL 메모 후보 조회가 실패하면 편집을 잠그고 재시도 후 기존 메모를 연다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ url: CANDIDATE_URL, memo: "기존 메모 본문" }));
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<h1>Memo retry</h1>" }),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);

	let failCandidateLookup = true;
	let failedCandidateLookups = 0;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (
			failCandidateLookup &&
			route.request().method() === "GET" &&
			getMemoQueryPageKeys(route.request().url())?.includes(CANDIDATE_URL)
		) {
			failedCandidateLookups += 1;
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ message: "injected candidate lookup failure" }),
			});
			return;
		}
		await route.fallback();
	});

	await page.goto(CANDIDATE_URL);
	const textarea = panel.locator("#memo-textarea");
	const loadError = panel.getByRole("status").filter({
		has: panel.getByRole("button", { name: /retry|다시 시도/i }),
	});
	// 기본 QueryClient가 실패 조회를 재시도하므로 최종 오류 표시까지 기다린다.
	await expect(loadError).toBeVisible({ timeout: 20_000 });
	expect(failedCandidateLookups).toBeGreaterThan(0);
	await expect(textarea).toHaveAttribute("readonly", "");
	await expect(textarea).toHaveValue("");

	failCandidateLookup = false;
	await loadError.getByRole("button", { name: /retry|다시 시도/i }).click();
	await expect(textarea).toBeEditable();
	await expect(textarea).toHaveValue("기존 메모 본문");
	expect(
		store.getAllMemos().filter((memo) => memo.url === CANDIDATE_URL),
	).toHaveLength(1);
});
