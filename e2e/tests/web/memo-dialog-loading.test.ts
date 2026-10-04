import type { Page, Route } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockHighlight,
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

function createGate() {
	let release = () => {};
	const blocked = new Promise<void>((resolve) => {
		release = resolve;
	});
	let signalRequest = () => {};
	const requested = new Promise<void>((resolve) => {
		signalRequest = resolve;
	});
	return { blocked, release, requested, signalRequest };
}

function isDetailMemoGet(route: Route, memoId: number) {
	const url = new URL(route.request().url());
	return (
		route.request().method() === "GET" &&
		url.pathname.endsWith("/memo") &&
		url.searchParams.get("id") === `eq.${memoId}`
	);
}

async function openMemos(page: Page, store: MockSupabaseStore) {
	await setupSupabaseMocks(page, store);
	await gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});
}

test.describe("메모 상세의 즉시 표시와 백그라운드 조회 (Mocked)", () => {
	test.beforeEach(() => resetMockIds());

	test("상세 조회가 지연되어도 카드 본문을 즉시 보이고 초기 주입은 저장하지 않는다", async ({
		page,
	}) => {
		const store = new MockSupabaseStore();
		const memoText = "First-paint memo ".repeat(35);
		const memo = store.addMemo(createMockMemo({ memo: memoText }));
		await openMemos(page, store);

		const detailGate = createGate();
		const patchBodies: unknown[] = [];
		await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
			if (route.request().method() === "PATCH") {
				patchBodies.push(route.request().postDataJSON());
			}
			if (isDetailMemoGet(route, memo.id)) {
				detailGate.signalRequest();
				await detailGate.blocked;
			}
			await route.fallback();
		});

		try {
			await page.locator(".memo-item", { hasText: memoText }).click();
			await detailGate.requested;
			const dialog = page.getByRole("dialog");
			const textarea = dialog.getByTestId("memo-textarea");
			await expect(textarea).toHaveValue(memoText);
			const before = await textarea.boundingBox();
			expect(before).not.toBeNull();
			// 입력 내용의 높이가 이미 반영되어야 하므로 서버 응답 뒤 확대되지 않는다.
			const sizing = await textarea.evaluate((element) => ({
				clientHeight: element.clientHeight,
				scrollHeight: element.scrollHeight,
			}));
			expect(sizing.clientHeight).toBeGreaterThanOrEqual(
				sizing.scrollHeight - 2,
			);

			const detailResponse = page.waitForResponse(
				(response) =>
					response.request().method() === "GET" &&
					new URL(response.url()).searchParams.get("id") === `eq.${memo.id}`,
			);
			detailGate.release();
			await detailResponse;
			await expect(textarea).toHaveValue(memoText);
			const after = await textarea.boundingBox();
			expect(after).not.toBeNull();
			expect(
				Math.abs((after?.height ?? 0) - (before?.height ?? 0)),
			).toBeLessThan(4);
			await page.waitForTimeout(1_200);
			expect(patchBodies).toEqual([]);
		} finally {
			detailGate.release();
		}
	});

	test("백그라운드 최신값은 미편집 필드에만 반영하고 PATCH는 편집 필드만 보낸다", async ({
		page,
	}) => {
		const store = new MockSupabaseStore();
		store.setSetting(createMockSetting({ show_impression: true }));
		const memo = store.addMemo(
			createMockMemo({ memo: "Card body", impression: "Card impression" }),
		);
		await openMemos(page, store);

		const detailGate = createGate();
		const patchBodies: Record<string, unknown>[] = [];
		await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
			if (route.request().method() === "PATCH") {
				patchBodies.push(route.request().postDataJSON());
			}
			if (isDetailMemoGet(route, memo.id)) {
				detailGate.signalRequest();
				await detailGate.blocked;
			}
			await route.fallback();
		});

		try {
			await page.locator(".memo-item", { hasText: "Card body" }).click();
			await detailGate.requested;
			const dialog = page.getByRole("dialog");
			const body = dialog.getByTestId("memo-textarea");
			const impression = dialog.getByTestId("impression-textarea");
			await expect(body).toHaveValue("Card body");
			await expect(impression).toHaveValue("Card impression");
			await body.fill("Edited body");
			store.updateMemo(memo.id, {
				memo: "Server body",
				impression: "Fresh impression",
			});
			detailGate.release();
			await expect(impression).toHaveValue("Fresh impression");
			await expect(body).toHaveValue("Edited body");
			await expect.poll(() => patchBodies.length).toBe(1);
			expect(patchBodies[0]).toEqual({ memo: "Edited body" });
		} finally {
			detailGate.release();
		}
	});

	test("하이라이트 조회 중에는 영역이 없고 결과가 있으면 기본 접힘 상태에서 펼친다", async ({
		page,
	}) => {
		const store = new MockSupabaseStore();
		const memo = store.addMemo(createMockMemo({ memo: "Quoted memo" }));
		store.addHighlight(
			createMockHighlight({ url: memo.url, exact_text: "Delayed quote" }),
		);
		const highlightGate = createGate();
		await setupSupabaseMocks(page, store);
		await page.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
			if (route.request().method() === "GET") {
				highlightGate.signalRequest();
				await highlightGate.blocked;
			}
			await route.fallback();
		});
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		try {
			await page.locator(".memo-item", { hasText: "Quoted memo" }).click();
			await highlightGate.requested;
			const dialog = page.getByRole("dialog");
			await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
				"Quoted memo",
			);
			await expect(
				dialog.getByRole("button", { name: "Highlights (1)" }),
			).toHaveCount(0);
			await expect(dialog.getByText("Delayed quote")).toHaveCount(0);
			highlightGate.release();
			const toggle = dialog.getByRole("button", { name: "Highlights (1)" });
			await expect(toggle).toBeVisible();
			await expect(dialog.getByText("Delayed quote")).toHaveCount(0);
			await toggle.click();
			await expect(dialog.getByText("Delayed quote")).toBeVisible();
		} finally {
			highlightGate.release();
		}
	});

	test("하이라이트가 없으면 상세에 하이라이트 영역을 만들지 않는다", async ({
		page,
	}) => {
		const store = new MockSupabaseStore();
		store.addMemo(createMockMemo({ memo: "No-quote memo" }));
		const highlightResponse = page.waitForResponse(
			(response) =>
				response.request().method() === "GET" &&
				new URL(response.url()).pathname.endsWith("/highlight"),
		);
		await openMemos(page, store);
		await highlightResponse;
		await page.locator(".memo-item", { hasText: "No-quote memo" }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByTestId("memo-textarea")).toHaveValue(
			"No-quote memo",
		);
		await expect(
			dialog.getByRole("button", { name: /Highlights \(\d+\)/ }),
		).toHaveCount(0);
		await expect(
			dialog.getByRole("region", { name: "Highlights" }),
		).toHaveCount(0);
	});

	test("여러 줄을 연속 입력하면 본문 높이가 내용에 맞춰 증가한다", async ({
		page,
	}) => {
		const store = new MockSupabaseStore();
		store.addMemo(createMockMemo({ memo: "Short body" }));
		await openMemos(page, store);
		await page.locator(".memo-item", { hasText: "Short body" }).click();
		const textarea = page.getByRole("dialog").getByTestId("memo-textarea");
		await expect(textarea).toHaveValue("Short body");
		const initialHeight = await textarea.evaluate(
			(element) => element.clientHeight,
		);
		const longText = Array.from(
			{ length: 16 },
			(_, index) => `Line ${index}`,
		).join("\n");
		await textarea.fill(longText);
		await expect(textarea).toHaveValue(longText);
		await expect
			.poll(() =>
				textarea.evaluate(
					(element) => element.clientHeight - element.scrollHeight,
				),
			)
			.toBeGreaterThanOrEqual(-2);
		const expandedHeight = await textarea.evaluate(
			(element) => element.clientHeight,
		);
		expect(expandedHeight).toBeGreaterThan(initialHeight);
	});

	test("첫 저장 응답 대기 중 추가 입력하고 닫아도 마지막 입력까지 저장한다", async ({
		page,
	}) => {
		const store = new MockSupabaseStore();
		const memo = store.addMemo(createMockMemo({ memo: "Original body" }));
		await openMemos(page, store);
		const firstPatchGate = createGate();
		let patchRequests = 0;
		let patchResponses = 0;
		await page.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
			if (route.request().method() === "PATCH") {
				patchRequests += 1;
				if (patchRequests === 1) {
					firstPatchGate.signalRequest();
					await firstPatchGate.blocked;
				}
			}
			await route.fallback();
		});
		page.on("response", (response) => {
			if (
				response.request().method() === "PATCH" &&
				new URL(response.url()).pathname.endsWith("/memo")
			) {
				patchResponses += 1;
			}
		});
		await page.locator(".memo-item", { hasText: "Original body" }).click();
		const dialog = page.getByRole("dialog");
		const textarea = dialog.getByTestId("memo-textarea");
		await expect(textarea).toHaveValue("Original body");
		try {
			await textarea.fill("First edit");
			await firstPatchGate.requested;
			await textarea.fill("Last edit before close");
			await dialog.getByTestId("memo-close-button").click();
			await expect(dialog).toBeHidden();
			firstPatchGate.release();
			await expect.poll(() => patchResponses).toBe(2);
			expect(store.getMemo(memo.id)?.memo).toBe("Last edit before close");
		} finally {
			firstPatchGate.release();
		}
	});
});
