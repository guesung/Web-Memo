import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/**
 * 재조회를 이만큼 늦춘다.
 * @description 이어서 친 글자가 덮이는 창을 열되, 디바운스 저장(1초)보다는 짧아야 한다.
 * 더 길면 재조회가 이미 두 번째 저장이 반영된 값을 받아와 덮어쓰기가 관측되지 않는다.
 */
const REFETCH_DELAY_MS = 300;

test.describe("메모 수정 기능 (Mocked)", () => {
	let store: MockSupabaseStore;
	let memoText: string;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		memoText = `Test Memo ${Date.now()}`;
		const mockMemo = createMockMemo({ memo: memoText, title: memoText });
		store.addMemo(mockMemo);

		await setupSupabaseMocks(page, store);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("메모를 수정할 수 있다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.click();

		const newMemoText = `Updated Memo ${Date.now()}`;

		// 원래 메모가 채워지기 전에 값을 흘리면 react-hook-form이 변경을 구독하기 전이라
		// 디바운스 저장이 아예 걸리지 않는다. 로드가 끝난 뒤에 입력한다.
		const textarea = page.getByTestId("memo-textarea");
		await expect(textarea).toHaveValue(memoText);

		// 저장이 성공하면 onSuccess가 곧바로 memo 쿼리를 무효화해 재조회 GET이 PATCH 응답 직후 나간다.
		// PATCH를 기다린 뒤에 GET 대기를 걸면 이미 지나간 응답을 놓치므로, 입력 전에 둘 다 걸어 둔다.
		// PATCH 응답을 본 뒤의 GET만 재조회로 친다.
		let hasPatchResponded = false;
		const patchResponsePromise = page.waitForResponse((resp) => {
			const isPatchResponse =
				resp.url().includes("/rest/v1/memo") &&
				resp.request().method() === "PATCH";
			if (isPatchResponse) {
				hasPatchResponded = true;
			}

			return isPatchResponse;
		});
		const refetchResponsePromise = page.waitForResponse(
			(resp) =>
				hasPatchResponded &&
				resp.url().includes("/rest/v1/memo") &&
				resp.request().method() === "GET",
		);

		await textarea.evaluate((el, text) => {
			const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
				window.HTMLTextAreaElement.prototype,
				"value",
			)?.set;
			nativeTextAreaValueSetter?.call(el, text);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}, newMemoText);

		await patchResponsePromise;
		await refetchResponsePromise;

		await page.getByTestId("memo-close-button").click();

		const newMemoItem = page.locator(".memo-item", {
			hasText: newMemoText,
		});

		await newMemoItem.click();

		await expect(page.getByTestId("memo-textarea")).toHaveValue(newMemoText);
	});

	test("저장이 끝난 뒤에 이어서 입력해도, 그 입력이 사라지지 않는다.", async ({
		page,
	}) => {
		// setupSupabaseMocks보다 뒤에 등록해야 먼저 걸린다.
		await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
			const url = new URL(route.request().url());
			const isSingleMemoQuery =
				route.request().method() === "GET" &&
				url.searchParams.get("id")?.startsWith("eq.");

			if (isSingleMemoQuery) {
				await new Promise((resolve) => setTimeout(resolve, REFETCH_DELAY_MS));
			}

			await route.fallback();
		});

		await page.locator(".memo-item", { hasText: memoText }).click();

		const textarea = page.getByTestId("memo-textarea");
		await expect(textarea).toHaveValue(memoText);

		const patchResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes("/rest/v1/memo") &&
				resp.request().method() === "PATCH",
		);

		await textarea.fill("먼저 친 글");
		await patchResponsePromise;

		// 저장이 성공하면 memo 쿼리가 무효화돼 memoData가 새로 온다. 그 사이에 친
		// 글자가 서버 값으로 덮이면 안 된다. 재조회가 입력보다 먼저 끝나 버리면
		// 고치기 전 코드에서도 통과하므로, 재조회를 늦춰 창을 확실히 연다.
		await textarea.fill("먼저 친 글 그리고 이어서 친 글");
		// 조건 대기로 바꾸지 않는다. 기다릴 조건이 "덮어쓰기가 일어나지 않음"이라 관측할 이벤트가 없다.
		// 늦춘 재조회가 끝날 만큼 시간을 흘려보내 회귀가 드러날 창을 연 채로 둔다.
		await page.waitForTimeout(REFETCH_DELAY_MS + 400);

		await expect(textarea).toHaveValue("먼저 친 글 그리고 이어서 친 글");
	});
});
