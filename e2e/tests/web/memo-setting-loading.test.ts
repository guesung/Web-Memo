import type { Page, Route } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

const TITLE = "Setting-independent memo";
const toggleName = "Shorten memo content";

async function setupMemo(page: Page) {
	resetMockIds();
	const store = new MockSupabaseStore();
	store.addMemo(createMockMemo({ title: TITLE }));
	await setupSupabaseMocks(page, store);
}

function isSettingGet(route: Route) {
	return route.request().method() === "GET";
}

test("설정 응답을 기다리는 동안에도 그리드 목록을 보여주고 토글만 잠근다.", async ({
	page,
}) => {
	await setupMemo(page);
	let releaseSetting: (() => void) | undefined;
	const settingGate = new Promise<void>((resolve) => {
		releaseSetting = resolve;
	});
	let receivedSettingRequest: (() => void) | undefined;
	const requestReceived = new Promise<void>((resolve) => {
		receivedSettingRequest = resolve;
	});
	await page.route(`${SUPABASE.url}/rest/v1/setting**`, async (route) => {
		if (!isSettingGet(route)) return route.fallback();
		receivedSettingRequest?.();
		await settingGate;
		await route.fallback();
	});

	try {
		await page.goto(`${LANGUAGE}${PATHS.memos}`);
		await requestReceived;
		await expect(page.locator(".memo-item", { hasText: TITLE })).toBeVisible();
		await expect(page.getByRole("button", { name: toggleName })).toBeDisabled();
	} finally {
		releaseSetting?.();
	}
	await expect(page.getByRole("button", { name: toggleName })).toBeEnabled();
});

test("설정 조회가 실패해도 날짜 목록이 남고, 재시도 뒤 토글을 사용할 수 있다.", async ({
	page,
}) => {
	await setupMemo(page);
	let shouldFail = true;
	await page.route(`${SUPABASE.url}/rest/v1/setting**`, async (route) => {
		if (!isSettingGet(route)) return route.fallback();
		if (!shouldFail) return route.fallback();
		await route.fulfill({
			status: 503,
			contentType: "application/json",
			body: JSON.stringify({ message: "Mock setting unavailable" }),
		});
	});

	await page.goto(`${LANGUAGE}${PATHS.memos}?view=list`);
	await expect(
		page.getByTestId("memo-list-item").filter({ hasText: TITLE }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: toggleName })).toBeDisabled();
	const alert = page
		.getByRole("alert")
		.filter({ hasText: "Something went wrong" });
	await expect(alert).toBeVisible({ timeout: 20_000 });
	shouldFail = false;
	await alert.getByRole("button", { name: "Try again" }).click();
	await expect(page.getByRole("button", { name: toggleName })).toBeEnabled();
	await expect(
		page.getByTestId("memo-list-item").filter({ hasText: TITLE }),
	).toBeVisible();
});
