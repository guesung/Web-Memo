import { SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const OFFLINE_SAVE_URL = "https://example.com/offline-save";
const OFFLINE_CONFLICT_URL = "https://example.com/offline-conflict";

/**
 * 사이드 패널이 오프라인에서도 입력을 잃지 않고 온라인 복귀 시 서버에 반영하는지 확인한다.
 * @description context.setOffline은 navigator.onLine과 online/offline 이벤트를 실제로
 * 뒤집는다(라우트 가로채기 자체를 막지는 않는다). useOnlineStatus·saveMemo가 이 신호로
 * 오프라인 대기열 분기를 타므로, 오프라인 구간에서는 /rest/v1/memo 요청이 전혀 나가지 않아야 한다.
 */
test("오프라인에서 입력한 메모는 대기열에 남고, 온라인이 되면 서버에 저장된다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	const memo = store.addMemo(
		createMockMemo({ url: OFFLINE_SAVE_URL, memo: "기존 내용" }),
	);
	await setupSupabaseMocks(page, store);

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);

	await page.goto(OFFLINE_SAVE_URL);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"기존 내용",
	);

	let memoRequestCount = 0;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (route.request().method() !== "GET") {
			memoRequestCount += 1;
		}
		await route.fallback();
	});

	await context.setOffline(true);

	const offlineText = "오프라인에서 쓴 내용";
	await sidePanelPage.locator("#memo-textarea").fill(offlineText);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		offlineText,
	);

	// 디바운스가 끝날 시간을 기다려도 오프라인이면 저장 요청 자체가 나가지 않는다.
	await sidePanelPage.waitForTimeout(500);
	expect(memoRequestCount).toBe(0);
	await expect(sidePanelPage.getByText(/offline/i).first()).toBeVisible();

	const syncResponsePromise = sidePanelPage.waitForResponse(
		(response) =>
			response.url().includes("/rest/v1/memo") &&
			response.request().method() !== "GET" &&
			response.ok(),
	);
	await context.setOffline(false);
	await syncResponsePromise;

	await expect(sidePanelPage.getByText(/^(Saved|저장됨)$/)).toBeVisible();
	expect(store.getMemo(memo.id)?.memo).toBe(offlineText);

	await sidePanelPage.reload();
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		offlineText,
	);
});

/**
 * 오프라인 구간에 서버의 메모가 다른 곳에서 바뀌면(다른 updated_at), flush는 같은 주소에
 * 새 메모를 insert하고 편집기를 그 메모로 전환한다.
 */
test("오프라인 중 서버 메모가 바뀌면 충돌로 새 메모에 저장하고 편집기를 전환한다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	const memo = store.addMemo(
		createMockMemo({ url: OFFLINE_CONFLICT_URL, memo: "원래 내용" }),
	);
	await setupSupabaseMocks(page, store);

	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);

	await page.goto(OFFLINE_CONFLICT_URL);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"원래 내용",
	);

	await context.setOffline(true);

	const offlineText = "충돌 나기 전 오프라인 입력";
	await sidePanelPage.locator("#memo-textarea").fill(offlineText);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		offlineText,
	);
	await sidePanelPage.waitForTimeout(500);

	// 오프라인인 사이 다른 곳(다른 기기·다른 탭)에서 같은 메모를 바꿨다고 가정한다.
	// updateMemo는 항상 updated_at을 새로 찍으므로 대기열의 baseUpdatedAt과 어긋난다.
	store.updateMemo(memo.id, { memo: "다른 곳에서 바뀐 내용" });

	const insertResponsePromise = sidePanelPage.waitForResponse(
		(response) =>
			response.url().includes("/rest/v1/memo") &&
			response.request().method() === "POST" &&
			response.ok(),
	);
	await context.setOffline(false);
	await insertResponsePromise;

	const conflictToast = sidePanelPage.getByRole("status").filter({
		hasText: /new memo|새 메모/i,
	});
	await expect(conflictToast).toBeVisible();

	// 원래 메모는 다른 곳에서 바꾼 내용 그대로고, 오프라인 입력은 새 메모로 따로 저장됐다.
	expect(store.getMemo(memo.id)?.memo).toBe("다른 곳에서 바뀐 내용");
	const allMemos = store.getAllMemos();
	expect(
		allMemos.some(
			(candidate) =>
				candidate.url === OFFLINE_CONFLICT_URL &&
				candidate.memo === offlineText,
		),
	).toBe(true);

	await conflictToast
		.getByRole("button", { name: /choose another|다른 메모 선택/i })
		.click();
	await expect(
		sidePanelPage.getByText(/choose a note|메모를 선택하세요/i),
	).toBeVisible();
});
