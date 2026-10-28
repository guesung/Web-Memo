import type { ConsoleMessage } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

const TARGET_URL = "https://example.com/first-memo-tracking";

/** 개발 콘솔 이벤트와 목 저장소로 준비·유효 본문·클라우드 결과를 구별한다. */
test("후보 조회 완료 후 준비를 한 번 기록하고 유효 본문의 실제 저장과 오프라인 동기화를 구별한다", async ({
	page,
	context,
}) => {
	const events: { name: string; params: Record<string, unknown> }[] = [];
	const captureAnalytics = async (message: ConsoleMessage) => {
		const name = message
			.text()
			.match(
				/^\[analytics\] (memo_editor_ready|memo_content_saved|memo_save_result)\b/,
			)?.[1];
		if (!name) return;
		const params = await message.args()[1]?.jsonValue();
		events.push({ name, params });
	};
	const watchPage = (target: typeof page) =>
		target.on("console", (message) => void captureAnalytics(message));
	context.pages().forEach(watchPage);
	context.on("page", watchPage);
	// 개발 빌드는 콘솔만 사용한다. 환경 설정이 달라도 테스트 이벤트가 GA로 전송되지 않게 막는다.
	await context.route(/https:\/\/[^/]*google-analytics\.com\//, (route) =>
		route.fulfill({ status: 204 }),
	);
	const store = new MockSupabaseStore();
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: "<h1>Tracking fixture</h1>",
		}),
	);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const panel = await findSidePanelPage(page);
	await expect(panel.locator("#memo-textarea")).toBeEditable();
	await expect
		.poll(() => events.some((event) => event.name === "memo_editor_ready"))
		.toBe(true);

	let releaseCandidates: () => void = () => {};
	const candidatesGate = new Promise<void>((resolve) => {
		releaseCandidates = resolve;
	});
	let holdCandidates = true;
	await context.route(`${SUPABASE.url}/rest/v1/memo**`, async (route) => {
		if (holdCandidates && route.request().method() === "GET")
			await candidatesGate;
		await route.fallback();
	});
	events.length = 0;
	await page.goto(TARGET_URL);
	const textarea = panel.locator("#memo-textarea");
	await expect(textarea).toHaveAttribute("readonly", "");
	expect(
		events.filter((event) => event.name === "memo_editor_ready"),
	).toHaveLength(0);
	holdCandidates = false;
	releaseCandidates();
	await expect(textarea).toBeEditable();
	await expect
		.poll(
			() => events.filter((event) => event.name === "memo_editor_ready").length,
		)
		.toBe(1);

	const savedCount = () =>
		events.filter((event) => event.name === "memo_content_saved").length;
	const resultCount = () =>
		events.filter((event) => event.name === "memo_save_result").length;
	await panel.locator("#memo-title-input").fill("제목만 변경");
	await expect.poll(resultCount).toBe(1);
	expect(savedCount()).toBe(0);
	await textarea.fill("   ");
	await expect.poll(resultCount).toBe(2);
	expect(savedCount()).toBe(0);
	await textarea.fill("유효 본문");
	await expect.poll(savedCount).toBe(1);
	expect(store.getMemoByUrl(TARGET_URL)?.memo).toBe("유효 본문");
	await textarea.fill("");
	await expect.poll(resultCount).toBe(4);
	expect(savedCount()).toBe(1);

	await context.setOffline(true);
	await textarea.fill("오프라인 유효 본문");
	await expect(
		panel.getByText(/saved on this device|이 기기에 저장됨/i).first(),
	).toBeVisible();
	expect(resultCount()).toBe(4);
	expect(savedCount()).toBe(1);
	await context.setOffline(false);
	await expect.poll(savedCount).toBe(2);
	await expect.poll(resultCount).toBe(5);
	expect(
		events
			.filter((event) => event.name === "memo_content_saved")
			.map((event) => event.params.source),
	).toEqual(["side_panel", "offline_sync"]);
	expect(
		events.filter((event) => event.name === "memo_editor_ready"),
	).toHaveLength(1);
	for (const event of events) {
		expect(event.params).not.toHaveProperty("memo");
		expect(event.params).not.toHaveProperty("url");
		expect(event.params).not.toHaveProperty("memo_id");
	}
});
