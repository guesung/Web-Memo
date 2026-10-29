import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("MemoDialog dismiss 동작 (Mocked)", () => {
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

	test("드롭다운이 열린 상태에서 외부를 클릭하면, 드롭다운만 닫히고 Dialog는 유지된다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-option").click();
		await expect(page.getByTestId("memo-delete-button")).toBeVisible();

		// Click overlay area (outside dialog content) to dismiss only the dropdown
		await page.mouse.click(10, 10);

		await expect(page.getByTestId("memo-delete-button")).toBeHidden();
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();
	});

	test("드롭다운이 열린 상태에서 Escape를 누르면, 드롭다운만 닫히고 Dialog는 유지된다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-option").click();
		await expect(page.getByTestId("memo-delete-button")).toBeVisible();

		await page.keyboard.press("Escape");

		await expect(page.getByTestId("memo-delete-button")).toBeHidden();
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();
	});

	test("드롭다운을 Escape로 닫은 직후 다시 Escape를 누르면, Dialog가 닫힌다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-option").click();
		await expect(page.getByTestId("memo-delete-button")).toBeVisible();

		// Radix는 닫히는 애니메이션 동안 포퍼 래퍼를 붙잡아 둔다. 그 사이에 누른
		// 두 번째 Escape가 삼켜지면 안 되므로, 드롭다운이 사라지길 기다리지 않고
		// 곧바로 다시 누른다. 기다리면 애니메이션 창을 지나쳐 회귀를 못 잡는다.
		await page.keyboard.press("Escape");
		await page.keyboard.press("Escape");

		await expect(dialog).toBeHidden();
	});

	test("닫기 버튼을 클릭하면, Dialog가 정상적으로 닫힌다.", async ({
		page,
	}) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-close-button").click();

		await expect(dialog).toBeHidden();
	});

	test("카드에서 열면 카드 위치에서 상세가 펼쳐지고 닫을 때 되돌아간다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.evaluate(() => {
			const originalAnimate = Element.prototype.animate;
			const motionWindow = window as typeof window & {
				memoMotionFrames: Keyframe[][];
			};
			motionWindow.memoMotionFrames = [];
			Element.prototype.animate = function (...args) {
				if (this.getAttribute("role") === "dialog" && Array.isArray(args[0])) {
					motionWindow.memoMotionFrames.push(args[0]);
				}
				return originalAnimate.apply(this, args);
			};
		});
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toHaveAttribute("data-memo-motion", "card");
		const openFrames = await page.evaluate(
			() =>
				(window as typeof window & { memoMotionFrames: Keyframe[][] })
					.memoMotionFrames[0],
		);
		expect(String(openFrames[0].clipPath).startsWith("inset(")).toBe(true);
		expect(String(openFrames[0].translate)).not.toBe("0px 0px");

		await dialog.getByTestId("memo-close-button").click();
		const closeFrames = await page.evaluate(() =>
			(
				window as typeof window & { memoMotionFrames: Keyframe[][] }
			).memoMotionFrames.at(-1),
		);
		expect(closeFrames?.[0].translate).toBe("0px 0px");
		expect(closeFrames?.[1].translate).toBe(openFrames[0].translate);
		await expect(dialog).toBeHidden();
		await expect(page).not.toHaveURL(/\?id=/);
	});

	test("모션 줄이기 설정에서는 카드와 상세 사이 전환을 즉시 마친다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.locator(".memo-item", { hasText: memoText }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog).toHaveAttribute("data-memo-motion", "card");
		const animationCount = await dialog.evaluate(
			(element) => element.getAnimations().length,
		);
		expect(animationCount).toBe(0);
		await dialog.getByTestId("memo-close-button").click();
		await expect(dialog).toBeHidden();
	});

	test("닫기 모션이 시작되면 추가 입력과 다음 메모 이동을 막는다", async ({
		page,
	}) => {
		const nextMemo = store.addMemo(
			createMockMemo({ memo: "Next memo during close" }),
		);
		await page.reload();
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		const memoId = Number(await memoItem.getAttribute("id"));
		await memoItem.click();
		const dialog = page.getByRole("dialog");
		const textarea = dialog.getByTestId("memo-textarea");
		await textarea.fill("Saved before close");
		await dialog.getByTestId("memo-close-button").click();
		await expect(dialog).toHaveAttribute("inert", "");
		await page.keyboard.insertText("late edit");
		await page.keyboard.press("ArrowRight");
		await page.evaluate(() => {
			(
				document.querySelector(
					'[data-testid="memo-dialog-next"]',
				) as HTMLButtonElement
			)?.click();
		});
		await expect(textarea).toHaveValue("Saved before close");
		await expect(page).not.toHaveURL(new RegExp(`id=${nextMemo.id}`));
		await expect(dialog).toBeHidden();
		await expect
			.poll(() => store.getMemo(memoId)?.memo)
			.toBe("Saved before close");
	});

	test("닫는 중 브라우저 뒤로가기로 상세가 해제되어도 다음 상세 URL을 보존한다", async ({
		page,
	}) => {
		const nextMemo = store.addMemo(
			createMockMemo({ memo: "Second memo after back" }),
		);
		await page.reload();
		await page.locator(".memo-item", { hasText: memoText }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByTestId("memo-close-button").click();
		await page.evaluate(() => history.back());
		await expect(dialog).toBeHidden();
		await page
			.locator(".memo-item", { hasText: "Second memo after back" })
			.click();
		await expect(page).toHaveURL(new RegExp(`id=${nextMemo.id}`));
		await page.waitForTimeout(350);
		await expect(page).toHaveURL(new RegExp(`id=${nextMemo.id}`));
		await expect(
			page.getByRole("dialog").getByTestId("memo-textarea"),
		).toHaveValue("Second memo after back");
	});

	test("Escape를 누르면, Dialog가 정상적으로 닫힌다.", async ({ page }) => {
		const memoItem = page.locator(".memo-item", { hasText: memoText });
		await memoItem.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog.getByTestId("memo-textarea")).toBeVisible();

		await dialog.getByTestId("memo-close-button").focus();
		await page.keyboard.press("Escape");

		await expect(dialog).toBeHidden();
	});
});
