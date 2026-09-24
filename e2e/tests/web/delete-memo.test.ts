import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/**
 * 토스트가 뜨는 프레임부터 닫힘 타이머를 멈춰 둔다.
 * @description 토스트는 2초 뒤 스스로 닫힌다(packages/ui Toaster의 duration). 부하가 걸리면 되돌리기
 * 클릭이 actionability를 기다리는 사이 2초가 지나, 토스트가 사라진 뒤 클릭이 테스트 타임아웃까지 매달린다.
 * Radix Toast는 알림 영역 위에서 포인터가 움직이면 타이머를 멈춘다(토스트에 마우스를 올린 사용자).
 * 그 리스너는 토스트가 붙은 직후에야 등록되므로, 테스트 쪽 왕복을 거치지 않고 페이지 안에서
 * 매 프레임 pointermove를 보내 등록 직후의 첫 프레임에 멈추게 한다. 토스트가 닫히면 멈춘다.
 */
const holdToastOpen = (page: Page) =>
	page.evaluate(() => {
		let hasSeenToast = false;

		const handleAnimationFrame = () => {
			const openToast = document.querySelector(
				'[role="region"][aria-label^="Notifications"] li[data-state="open"]',
			);

			if (openToast) {
				hasSeenToast = true;
				openToast.dispatchEvent(
					new PointerEvent("pointermove", { bubbles: true }),
				);
			}

			if (hasSeenToast && !openToast) {
				return;
			}

			requestAnimationFrame(handleAnimationFrame);
		};

		requestAnimationFrame(handleAnimationFrame);
	});

test.describe("메모 삭제 기능 (Mocked)", () => {
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

	test("메모를 삭제하면, 메모 그리드에서 삭제되며 토스트 메시지가 뜬다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await holdToastOpen(page);
		await page.getByTestId("memo-delete-button").click();

		await expect(memoItem).toBeHidden();
		await expect(
			page.getByText("Memo deleted", {
				exact: true,
			}),
		).toBeVisible();
	});

	test("메모를 삭제하면 뜨는 토스트 메시지의 '되돌리기'를 클릭하면 메모를 복구할 수 있다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", {
			hasText: memoText,
		});

		await memoItem.hover();
		await memoItem.getByTestId("memo-option").click();
		await holdToastOpen(page);
		await page.getByTestId("memo-delete-button").click();

		// 토스트를 붙잡아 뒀으니 삭제가 화면에 반영되기를 기다릴 수 있다. 반영 전에 되돌리면
		// 복구 단언이 삭제 이전의 카드를 보고 통과해 버린다.
		await expect(memoItem).toBeHidden();

		await page
			.getByText("Undo", {
				exact: true,
			})
			.click();

		// Use .memo-item locator to avoid strict mode violation (text appears in both title and content)
		const restoredMemo = page.locator(".memo-item", { hasText: memoText });
		await expect(restoredMemo).toBeVisible();
	});
});
