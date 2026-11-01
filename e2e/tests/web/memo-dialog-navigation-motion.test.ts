import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("메모 상세 이전·다음 본문 모션 (Mocked)", () => {
	let store: MockSupabaseStore;
	let middleMemoId: number;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();
		store.addMemo(createMockMemo({ title: "First motion memo" }));
		const middle = store.addMemo(
			createMockMemo({ title: "Middle motion memo", memo: "Middle body" }),
		);
		middleMemoId = middle.id;
		store.addMemo(createMockMemo({ title: "Last motion memo" }));
		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("버튼·키보드 이동은 본문만 방향에 맞게 전환하고 편집을 먼저 저장한다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.locator(".memo-item", { hasText: "Middle motion memo" }).click();
		const dialog = page.getByRole("dialog");
		const body = dialog.getByTestId("memo-dialog-body");
		await expect(body).toBeVisible();
		await page.evaluate(() => {
			const motionWindow = window as typeof window & {
				memoDialogNode: Element;
				memoOverlayNode: Element | null;
				memoBodyAnimations: { frames: Keyframe[]; duration: number }[];
			};
			const dialogNode = document.querySelector('[role="dialog"]');
			if (!dialogNode) throw new Error("Missing memo dialog");
			motionWindow.memoDialogNode = dialogNode;
			motionWindow.memoOverlayNode =
				motionWindow.memoDialogNode.previousElementSibling;
			motionWindow.memoBodyAnimations = [];
			const originalAnimate = Element.prototype.animate;
			Element.prototype.animate = function (...args) {
				if (this.getAttribute("data-testid") === "memo-dialog-body") {
					motionWindow.memoBodyAnimations.push({
						frames: args[0] as Keyframe[],
						duration: (args[1] as KeyframeAnimationOptions).duration as number,
					});
				}
				return originalAnimate.apply(this, args);
			};
		});
		await dialog.getByTestId("memo-textarea").fill("Edited before motion");
		await dialog.getByTestId("memo-dialog-next").click();
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Test memo content 3",
		);
		await expect
			.poll(() => store.getMemo(middleMemoId)?.memo)
			.toBe("Edited before motion");
		await expect
			.poll(() =>
				page.evaluate(() => {
					const motionWindow = window as typeof window & {
						memoDialogNode: Element;
						memoOverlayNode: Element | null;
						memoBodyAnimations: { frames: Keyframe[]; duration: number }[];
					};
					const currentDialog = document.querySelector('[role="dialog"]');
					return {
						dialogStable: motionWindow.memoDialogNode === currentDialog,
						overlayStable:
							motionWindow.memoOverlayNode ===
							currentDialog?.previousElementSibling,
						bodyCount: currentDialog?.querySelectorAll(
							'[data-testid="memo-dialog-body"]',
						).length,
						animations: motionWindow.memoBodyAnimations,
					};
				}),
			)
			.toMatchObject({ dialogStable: true, overlayStable: true, bodyCount: 1 });
		expect(
			await dialog.evaluate(
				(element) =>
					element
						.getAnimations()
						.filter((animation) => animation instanceof CSSAnimation).length,
			),
		).toBe(0);
		await expect(dialog).toHaveClass(/!animate-none/);
		expect(
			await page.evaluate(
				() => (document.activeElement as HTMLElement | null)?.dataset.testid,
			),
		).toBe("memo-dialog-prev");
		const nextFrames = await page.evaluate(
			() =>
				(
					window as typeof window & {
						memoBodyAnimations: { frames: Keyframe[]; duration: number }[];
					}
				).memoBodyAnimations,
		);
		expect(nextFrames).toHaveLength(1);
		expect(nextFrames[0]).toMatchObject({ duration: 180 });
		expect(String(nextFrames[0].frames[0].transform)).toBe("translateX(24px)");
		expect(nextFrames[0].frames[0].opacity).toBe(0);

		await expect(dialog.getByTestId("memo-dialog-prev")).toBeEnabled();
		await dialog.getByTestId("memo-dialog-prev").focus();
		await page.keyboard.press("ArrowLeft");
		await expect(page).toHaveURL(/id=1/);
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Test memo content 1",
		);
		const prevFrames = await page.evaluate(
			() =>
				(
					window as typeof window & {
						memoBodyAnimations: { frames: Keyframe[] }[];
					}
				).memoBodyAnimations,
		);
		expect(prevFrames).toHaveLength(2);
		expect(String(prevFrames[1].frames[0].transform)).toBe("translateX(-24px)");
		await dialog.getByTestId("memo-textarea").focus();
		await page.keyboard.press("ArrowRight");
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Test memo content 1",
		);
		expect(
			await page.evaluate(
				() =>
					(window as typeof window & { memoBodyAnimations: unknown[] })
						.memoBodyAnimations.length,
			),
		).toBe(2);
	});

	test("모션 줄이기에서는 이동이 즉시 끝나고 빠른 왕복·닫기는 이전 모션을 남기지 않는다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.locator(".memo-item", { hasText: "Middle motion memo" }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByTestId("memo-dialog-next").click();
		await expect(dialog.getByTestId("memo-dialog-body")).toBeVisible();
		expect(
			await dialog
				.getByTestId("memo-dialog-body")
				.evaluate((element) => element.getAnimations().length),
		).toBe(0);
		await dialog.getByTestId("memo-dialog-prev").click();
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Middle body",
		);
		await dialog.getByTestId("memo-close-button").click();
		await expect(dialog).toBeHidden();
		await expect(page).not.toHaveURL(/\?id=/);
	});

	test("진행 중인 본문 모션은 반대 이동과 닫기에서 취소된다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.locator(".memo-item", { hasText: "Middle motion memo" }).click();
		const dialog = page.getByRole("dialog");
		await page.evaluate(() => {
			const motionWindow = window as typeof window & {
				memoBodyAnimations: Animation[];
			};
			motionWindow.memoBodyAnimations = [];
			const originalAnimate = Element.prototype.animate;
			Element.prototype.animate = function (...args) {
				const animation = originalAnimate.apply(this, args);
				if (this.getAttribute("data-testid") === "memo-dialog-body") {
					animation.pause();
					animation.currentTime = 60;
					motionWindow.memoBodyAnimations.push(animation);
				}
				return animation;
			};
		});
		await dialog.getByTestId("memo-dialog-next").click();
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Test memo content 3",
		);
		const incomingStyle = await dialog
			.getByTestId("memo-dialog-body")
			.evaluate((element) => ({
				transform: getComputedStyle(element).transform,
				opacity: Number(getComputedStyle(element).opacity),
			}));
		expect(incomingStyle.transform).not.toBe("none");
		expect(incomingStyle.transform).not.toBe("matrix(1, 0, 0, 1, 0, 0)");
		expect(incomingStyle.opacity).toBeGreaterThan(0);
		expect(incomingStyle.opacity).toBeLessThan(1);

		await dialog.getByTestId("memo-dialog-prev").click();
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Middle body",
		);
		const statesAfterReturn = await page.evaluate(() =>
			(
				window as typeof window & { memoBodyAnimations: Animation[] }
			).memoBodyAnimations.map((animation) => animation.playState),
		);
		expect(statesAfterReturn).toEqual(["idle", "paused"]);
		await dialog.getByTestId("memo-close-button").click();
		await expect(dialog).toBeHidden();
		const statesAfterClose = await page.evaluate(() =>
			(
				window as typeof window & { memoBodyAnimations: Animation[] }
			).memoBodyAnimations.map((animation) => animation.playState),
		);
		expect(statesAfterClose).toEqual(["idle", "idle"]);
	});

	test("긴 메모 아래에서 키보드로 이동하면 새 메모는 위에서 시작한다", async ({
		page,
	}) => {
		store.updateMemo(middleMemoId, { memo: "Long memo line\n".repeat(150) });
		await page.reload();
		await page.locator(".memo-item", { hasText: "Middle motion memo" }).click();
		const dialog = page.getByRole("dialog");
		await dialog.evaluate((element) => {
			element.focus({ preventScroll: true });
			element.scrollTop = element.scrollHeight;
		});
		expect(
			await dialog.evaluate((element) => element.scrollTop),
		).toBeGreaterThan(0);
		await page.keyboard.press("ArrowRight");
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"Test memo content 1",
		);
		expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0);
	});
});
