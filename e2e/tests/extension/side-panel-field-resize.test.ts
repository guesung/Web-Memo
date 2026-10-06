import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 저장된 비율과 드래그한 비율을 페이지별 폼의 첫 DOM 반영부터 유지한다. */
test("페이지를 이동해도 입력 영역 비율을 유지하고 메모 내용만 바뀐다", async ({
	page,
	context,
}) => {
	const firstUrl = "https://example.com/field-resize-first";
	const secondUrl = "https://example.com/field-resize-second";
	const store = new MockSupabaseStore();
	store.setSetting(
		createMockSetting({ show_impression: true, show_action_item: true }),
	);
	store.addMemo(createMockMemo({ url: firstUrl, memo: "첫 페이지 메모" }));
	store.addMemo(createMockMemo({ url: secondUrl, memo: "둘째 페이지 메모" }));
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Resize test</h1>",
		});
	});
	await login(page);
	await skipGuide(page);
	const background = context.serviceWorkers()[0];
	await background.evaluate(async () => {
		await chrome.storage.sync.set({
			memoFieldRatios: { memo: 35, impression: 40, actionItem: 25 },
		});
	});
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(firstUrl);
	const memoTextarea = sidePanelPage.locator("#memo-textarea");
	await expect(memoTextarea).toHaveValue("첫 페이지 메모");
	await expect(memoTextarea.locator("..")).toHaveCSS("flex-grow", "35");

	const observedRatios: string[][] = [];
	await sidePanelPage.exposeFunction(
		"recordFieldRatios",
		(ratios: string[]) => {
			observedRatios.push(ratios);
		},
	);
	await sidePanelPage.evaluate(() => {
		const observer = new MutationObserver(() => {
			const fields = [
				"memo-textarea",
				"impression-textarea",
				"action-item-textarea",
			];
			const ratios = fields.map(
				(id) =>
					document.getElementById(id)?.parentElement?.style.flexGrow ?? "",
			);
			if (ratios.every(Boolean)) {
				void (window as TObservedWindow).recordFieldRatios(ratios);
			}
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["style"],
		});
	});

	await page.goto(secondUrl);
	await expect(memoTextarea).toHaveValue("둘째 페이지 메모");
	await expect.poll(() => observedRatios.length).toBeGreaterThan(0);
	expect(observedRatios.every((ratios) => ratios.join() === "35,40,25")).toBe(
		true,
	);

	const resizeHandle = sidePanelPage
		.locator("form")
		.getByRole("slider")
		.first();
	const handleBounds = await resizeHandle.boundingBox();
	if (!handleBounds) {
		throw new Error("입력 영역 크기 조절 핸들이 보이지 않습니다.");
	}
	await sidePanelPage.mouse.move(
		handleBounds.x + handleBounds.width / 2,
		handleBounds.y + handleBounds.height / 2,
	);
	await sidePanelPage.mouse.down();
	await sidePanelPage.mouse.move(
		handleBounds.x + handleBounds.width / 2,
		handleBounds.y + handleBounds.height / 2 + 25,
		{ steps: 5 },
	);
	await sidePanelPage.mouse.up();
	const resizedRatios = await sidePanelPage.evaluate(() =>
		["memo-textarea", "impression-textarea", "action-item-textarea"].map(
			(id) => document.getElementById(id)?.parentElement?.style.flexGrow ?? "",
		),
	);
	expect(Number(resizedRatios[0])).toBeGreaterThan(35);
	observedRatios.length = 0;
	await page.goto(firstUrl);
	await expect(memoTextarea).toHaveValue("첫 페이지 메모");
	await expect.poll(() => observedRatios.length).toBeGreaterThan(0);
	expect(
		observedRatios.every((ratios) => ratios.join() === resizedRatios.join()),
	).toBe(true);

	await sidePanelPage.reload();
	await expect(memoTextarea).toHaveValue("첫 페이지 메모");
	await expect(memoTextarea.locator("..")).toHaveCSS(
		"flex-grow",
		resizedRatios[0],
	);
});

/** Playwright가 브라우저에 주입한 DOM 관측 기록 함수. */
type TObservedWindow = typeof window & {
	recordFieldRatios: (ratios: string[]) => Promise<void>;
};
