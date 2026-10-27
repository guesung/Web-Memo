import { SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";
import { createMockHighlight } from "../lib/mocks/mockData";

const URL = "https://example.com/panel-highlights";

test("현재 페이지의 최근 인용 두 개를 보여주고, 전체 보기와 접기 상태를 복원한다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	for (const [index, text] of [
		"First quote",
		"Second quote",
		"Third quote",
	].entries()) {
		store.addHighlight(
			createMockHighlight({
				url: URL,
				exact_text: text,
				created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
			}),
		);
	}
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<p>Highlight page</p>" }),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await page.goto(URL);

	const highlights = panel.getByRole("region", {
		name: /Highlights on this page|이 페이지의 하이라이트/,
	});
	await expect(
		highlights.getByRole("button", { name: /Third quote/ }),
	).toBeVisible();
	await expect(
		highlights.getByRole("button", { name: /Second quote/ }),
	).toBeVisible();
	await expect(
		highlights.getByRole("button", { name: /First quote/ }),
	).toHaveCount(0);
	await expect(highlights.getByText("3", { exact: true })).toBeVisible();
	await highlights
		.getByRole("button", { name: /Show all 3|3개 모두 보기/ })
		.click();
	await expect(
		highlights.getByRole("button", { name: /First quote/ }),
	).toBeVisible();
	const disclosure = highlights.getByRole("button", {
		name: /Highlights on this page|이 페이지의 하이라이트/,
	});
	await disclosure.focus();
	await panel.keyboard.press("Enter");
	await expect(disclosure).toHaveAttribute("aria-expanded", "false");
	await expect(
		highlights.getByRole("button", { name: /First quote/ }),
	).toHaveCount(0);
	await disclosure.click();
	await expect(disclosure).toHaveAttribute("aria-expanded", "true");
	await expect(
		highlights.getByRole("button", { name: /First quote/ }),
	).toBeVisible();
	await expect(panel.locator("#memo-textarea")).toBeEditable();
	await page.goto("https://example.com/panel-highlights-other");
	await expect(
		highlights.getByText(/No highlights saved|저장한 하이라이트가 없어요/),
	).toBeVisible();
	await expect(
		highlights.getByRole("button", { name: /First quote/ }),
	).toHaveCount(0);
	await page.goto(URL);
	await expect(
		highlights.getByRole("button", { name: /Third quote/ }),
	).toBeVisible();
	await expect(
		highlights.getByRole("button", { name: /First quote/ }),
	).toHaveCount(0);
});

test("하이라이트 갱신 메시지로 목록을 갱신해도 작성 중인 메모와 포커스를 유지한다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<p>Highlight page</p>" }),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await page.goto(URL);
	const textarea = panel.locator("#memo-textarea");
	await expect(textarea).toBeEditable();
	await textarea.fill("My draft stays here");
	await textarea.focus();
	await textarea.evaluate((element) => {
		(element as HTMLTextAreaElement).setSelectionRange(3, 7);
	});
	store.addHighlight(
		createMockHighlight({ url: URL, exact_text: "New quote" }),
	);
	const background =
		context.serviceWorkers()[0] ??
		(await context.waitForEvent("serviceworker"));
	await background.evaluate(() =>
		chrome.runtime.sendMessage({
			type: "HIGHLIGHTS_CHANGED",
			payload: { pageKey: "https://example.com/panel-highlights" },
		}),
	);
	await expect(panel.getByRole("button", { name: /New quote/ })).toBeVisible();
	await expect(textarea).toHaveValue("My draft stays here");
	await expect(textarea).toBeFocused();
	expect(
		await textarea.evaluate((element) => {
			const field = element as HTMLTextAreaElement;
			return [field.selectionStart, field.selectionEnd];
		}),
	).toEqual([3, 7]);
});

test("하이라이트 조회 실패 후 재시도와 빈 상태에서도 메모를 편집할 수 있다", async ({
	page,
	context,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	let shouldFail = true;
	await context.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		if (
			shouldFail &&
			route.request().method() === "GET" &&
			!route.request().serviceWorker() &&
			route.request().frame().url().includes("side-panel") &&
			new globalThis.URL(route.request().url()).searchParams
				.get("page_key")
				?.includes("panel-highlights")
		) {
			shouldFail = false;
			await route.fulfill({
				status: 503,
				body: '{"message":"temporarily unavailable"}',
			});
			return;
		}
		await route.fallback();
	});
	await context.route("https://example.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<p>Highlight page</p>" }),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await page.goto(URL);
	const highlights = panel.getByRole("region", {
		name: /Highlights on this page|이 페이지의 하이라이트/,
	});
	await expect(
		highlights.getByText(
			/Couldn't load highlights|하이라이트를 불러오지 못했어요/,
		),
	).toBeVisible();
	await expect(panel.locator("#memo-textarea")).toBeEditable();
	await highlights.getByRole("button", { name: /Try again|다시 시도/ }).click();
	await expect(
		highlights.getByText(/No highlights saved|저장한 하이라이트가 없어요/),
	).toBeVisible();
	await expect(panel.locator("#memo-textarea")).toBeEditable();
});

test("하이라이트 조회의 일시적인 전송 실패는 수동 재시도 없이 복구한다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	store.addHighlight(
		createMockHighlight({ url: URL, exact_text: "Recovered quote" }),
	);
	await setupSupabaseMocks(page, store);
	let failedRequests = 0;
	await context.route(`${SUPABASE.url}/rest/v1/highlight**`, async (route) => {
		const request = route.request();
		if (
			failedRequests === 0 &&
			request.method() === "GET" &&
			!request.serviceWorker() &&
			request.frame().url().includes("side-panel") &&
			new globalThis.URL(request.url()).searchParams
				.get("page_key")
				?.includes("panel-highlights")
		) {
			failedRequests += 1;
			await route.abort("failed");
			return;
		}
		await route.fallback();
	});
	await context.route("https://example.com/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<p>Highlight page</p>" }),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await page.goto(URL);

	const highlights = panel.getByRole("region", {
		name: /Highlights on this page|이 페이지의 하이라이트/,
	});
	await expect(
		highlights.getByRole("button", { name: /Recovered quote/ }),
	).toBeVisible();
	expect(failedRequests).toBe(1);
	await expect(
		highlights.getByRole("button", { name: /Try again|다시 시도/ }),
	).toHaveCount(0);
	await expect(panel.locator("#memo-textarea")).toBeEditable();
});
