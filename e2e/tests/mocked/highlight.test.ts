import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
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

		await login(page);
		await skipGuide(page);
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
		const mockHighlight = createMockHighlight({
			exact_text: exactText,
			note: null,
		});
		store.addHighlight(mockHighlight);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.highlights),
		});

		await expect(page.getByText(exactText)).toBeVisible();

		await page.getByRole("button", { name: "Add a note" }).click();

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
});

test.describe("하이라이트 페이지 접근 제어 (Mocked)", () => {
	test("비로그인 상태로 접근하면 로그인 페이지로 보낸다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.highlights}`,
			regexp: new RegExp(PATHS.login),
		});

		await expect(page).toHaveURL(new RegExp(PATHS.login));
	});
});
