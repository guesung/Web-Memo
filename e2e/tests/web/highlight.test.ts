import type { Page } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockHighlight,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("하이라이트 페이지 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();

		await setupSupabaseMocks(page, store);
	});

	test("사이드바에서 하이라이트 페이지로 이동한다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		await page.getByRole("link", { name: "Highlights" }).click();

		await expect(page).toHaveURL(new RegExp(PATHS.highlights));
	});

	test("하이라이트가 없으면 빈 상태 문구를 보여준다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});

		await expect(page.getByText("No highlights yet")).toBeVisible();
	});

	test("검색어를 입력하면 문장·메모에 포함된 하이라이트만 남는다.", async ({
		page,
	}) => {
		store.addHighlight(createMockHighlight({ exact_text: "Apple pie recipe" }));
		store.addHighlight(
			createMockHighlight({ exact_text: "Banana bread", note: "apple note" }),
		);
		store.addHighlight(createMockHighlight({ exact_text: "Cherry tart" }));

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});

		await expect(page.getByText("Cherry tart")).toBeVisible();

		await page.getByLabel("Search text or notes").fill("apple");

		await expect(page.getByText("Apple pie recipe")).toBeVisible();
		await expect(page.getByText("Banana bread")).toBeVisible();
		await expect(page.getByText("Cherry tart")).not.toBeVisible();
	});

	test("색상 칩을 고르면 그 색 하이라이트만 남고, 없으면 결과 없음 문구를 보여준다.", async ({
		page,
	}) => {
		store.addHighlight(
			createMockHighlight({ exact_text: "Yellow one", color: "yellow" }),
		);
		store.addHighlight(
			createMockHighlight({ exact_text: "Green one", color: "green" }),
		);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});

		await page.getByRole("button", { name: "green" }).click();

		await expect(page.getByText("Green one")).toBeVisible();
		await expect(page.getByText("Yellow one")).not.toBeVisible();

		await page.getByRole("button", { name: "pink" }).click();

		await expect(page.getByText("No matching highlights")).toBeVisible();

		await page.getByRole("button", { name: "All" }).click();

		await expect(page.getByText("Yellow one")).toBeVisible();
		await expect(page.getByText("Green one")).toBeVisible();
	});

	test("코멘트를 입력하고 포커스를 잃으면 저장된다.", async ({ page }) => {
		const exactText = `Sample highlight ${Date.now()}`;
		const originalNote = `Original note ${Date.now()}`;
		const mockHighlight = createMockHighlight({
			exact_text: exactText,
			note: originalNote,
		});
		store.addHighlight(mockHighlight);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});

		await expect(page.getByText(exactText)).toBeVisible();

		// 빈 메모에는 추가 버튼이 없으므로, 이미 있는 메모를 눌러 편집 상태로 들어간다.
		await page.getByRole("button", { name: originalNote }).click();

		const noteText = `Note ${Date.now()}`;
		const noteTextbox = page.getByLabel("Highlight note");
		await noteTextbox.fill(noteText);

		const patchResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes("/rest/v1/highlight") &&
				resp.request().method() === "PATCH",
		);

		await noteTextbox.blur();

		await patchResponsePromise;

		await expect(page.getByRole("button", { name: noteText })).toBeVisible();

		// 새로고침 후에도 저장된 코멘트가 유지되는지 확인한다.
		await page.reload();

		await expect(page.getByRole("button", { name: noteText })).toBeVisible();
	});

	test.describe("하이라이트 삭제", () => {
		const SHARED_URL = "https://example.com/delete-target";

		const gotoHighlights = async (page: Page) => {
			await gotoSafely({
				page,
				url: `${LANGUAGE}${PATHS.highlights}`,
				regexp: new RegExp(PATHS.highlights),
			});
		};

		const openDeleteDialog = async (page: Page, exactText: string) => {
			const item = page.getByRole("listitem").filter({ hasText: exactText });
			await item
				.getByRole("button", { name: "More highlight actions" })
				.click();
			await page.getByRole("menuitem", { name: "Delete highlight" }).click();
			await expect(
				page.getByRole("alertdialog", { name: "Delete this highlight?" }),
			).toBeVisible();
		};

		test("⋯ 메뉴에서 삭제를 확인하면 항목이 사라지고 개수가 줄며 토스트를 보여준다.", async ({
			page,
		}) => {
			store.addHighlight(
				createMockHighlight({ exact_text: "Keep me", url: SHARED_URL }),
			);
			store.addHighlight(
				createMockHighlight({ exact_text: "Delete me", url: SHARED_URL }),
			);
			await gotoHighlights(page);
			await expect(page.getByText("Delete me")).toBeVisible();
			await expect(page.getByText("2", { exact: true })).toBeVisible();

			await openDeleteDialog(page, "Delete me");
			await page.getByRole("button", { name: "Delete", exact: true }).click();

			await expect(page.getByText("Highlight deleted")).toBeVisible();
			await expect(page.getByText("Delete me")).toHaveCount(0);
			await expect(page.getByText("Keep me")).toBeVisible();
			await expect(page.getByText("1", { exact: true })).toBeVisible();
		});

		test("그룹의 마지막 하이라이트를 지우면 그룹이 사라지고 빈 상태를 보여준다.", async ({
			page,
		}) => {
			store.addHighlight(
				createMockHighlight({ exact_text: "Only one", url: SHARED_URL }),
			);
			await gotoHighlights(page);

			await openDeleteDialog(page, "Only one");
			await page.getByRole("button", { name: "Delete", exact: true }).click();

			await expect(page.getByText("No highlights yet")).toBeVisible();
		});

		test("취소하면 항목이 그대로 남는다.", async ({ page }) => {
			store.addHighlight(createMockHighlight({ exact_text: "Stay here" }));
			await gotoHighlights(page);

			await openDeleteDialog(page, "Stay here");
			await page.getByRole("button", { name: "Cancel" }).click();

			await expect(page.getByRole("alertdialog")).toHaveCount(0);
			await expect(page.getByText("Stay here")).toBeVisible();
			expect(store.getAllHighlights()).toHaveLength(1);
		});

		test("삭제된 행이 없다는 응답이 오면 에러 토스트를 보여주고 항목을 유지한다.", async ({
			page,
		}) => {
			store.addHighlight(createMockHighlight({ exact_text: "Not deleted" }));
			await page.route(
				`${SUPABASE.url}/rest/v1/highlight?**`,
				async (route) => {
					if (route.request().method() !== "DELETE") {
						await route.fallback();
						return;
					}
					await route.fulfill({
						status: 200,
						contentType: "application/json",
						body: "[]",
					});
				},
			);
			await gotoHighlights(page);

			await openDeleteDialog(page, "Not deleted");
			await page.getByRole("button", { name: "Delete", exact: true }).click();

			await expect(
				page.getByText("Couldn't delete the highlight. Please try again."),
			).toBeVisible();
			await expect(page.getByText("Not deleted")).toBeVisible();
		});
	});
});

test.describe("하이라이트 페이지 접근 제어 (Mocked)", () => {
	// web 프로젝트는 로그인 세션(storageState)을 물려받으므로, 비로그인 동작은 세션을 비워서 본다.
	test.use({ storageState: { cookies: [], origins: [] } });

	test("비로그인 상태로 접근하면 로그인 페이지로 보낸다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.login),
		});

		await expect(page).toHaveURL(new RegExp(PATHS.login));
	});
});
