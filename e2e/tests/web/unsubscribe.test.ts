import type { Page } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";

const UNSUBSCRIBE_URL = `${SUPABASE.url}/functions/v1/weekly-report-unsubscribe`;
const TOKEN = "0b7f3c6e-2f0a-4d6b-9a55-3e5f0d7c1a11.c2lnbmF0dXJl";

// 로그인 없이 쓰는 페이지라 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

/** 수신 거부 POST를 가로채 주어진 상태로 답하고, 받은 요청 본문을 모은다. */
const mockUnsubscribe = async (
	page: Page,
	respond: { status: number; body: object } | "network-error",
) => {
	const requests: { method: string; contentType?: string; body: unknown }[] =
		[];

	await page.route(UNSUBSCRIBE_URL, async (route) => {
		const request = route.request();
		requests.push({
			method: request.method(),
			contentType: request.headers()["content-type"],
			body: request.postDataJSON(),
		});

		if (respond === "network-error") {
			await route.abort();
			return;
		}
		await route.fulfill({
			status: respond.status,
			contentType: "application/json",
			headers: { "access-control-allow-origin": "*" },
			body: JSON.stringify(respond.body),
		});
	});

	return requests;
};

test.describe("메일 수신 거부 페이지 (Mocked)", () => {
	test("페이지를 열기만 해서는 요청을 보내지 않고, 버튼을 누르면 토큰을 POST하고 완료를 보여준다.", async ({
		page,
	}) => {
		const requests = await mockUnsubscribe(page, {
			status: 200,
			body: { status: "ok" },
		});

		await page.goto(`/ko${PATHS.unsubscribe}?token=${TOKEN}`);
		await expect(
			page.getByRole("heading", { name: "주간 메모 메일을 그만 받을까요?" }),
		).toBeVisible();
		expect(requests).toHaveLength(0);

		await page.getByRole("button", { name: "메일 그만 받기" }).click();

		await expect(
			page.getByRole("heading", { name: "메일 수신을 껐어요" }),
		).toBeVisible();
		expect(requests).toEqual([
			{
				method: "POST",
				contentType: "application/json",
				body: { token: TOKEN },
			},
		]);
		await expect(
			page.getByRole("link", { name: "설정에서 다시 켜기" }),
		).toHaveAttribute("href", `/ko${PATHS.memosSetting}`);
	});

	test("처리 중에는 버튼이 비활성화된다.", async ({ page }) => {
		await page.route(UNSUBSCRIBE_URL, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: JSON.stringify({ status: "ok" }),
			});
		});

		await page.goto(`/ko${PATHS.unsubscribe}?token=${TOKEN}`);
		await page.getByRole("button", { name: "메일 그만 받기" }).click();

		await expect(page.getByRole("button", { name: "처리 중" })).toBeDisabled();
		await expect(
			page.getByRole("heading", { name: "메일 수신을 껐어요" }),
		).toBeVisible();
	});

	test("서버가 실패하면 안내와 다시 시도 버튼을 보여준다.", async ({
		page,
	}) => {
		await mockUnsubscribe(page, { status: 500, body: { error: "internal" } });

		await page.goto(`/ko${PATHS.unsubscribe}?token=${TOKEN}`);
		await page.getByRole("button", { name: "메일 그만 받기" }).click();

		await expect(page.getByRole("alert")).toContainText("처리하지 못했어요");
		await expect(page.getByRole("button", { name: "다시 시도" })).toBeEnabled();
	});

	test("네트워크 오류도 실패로 보여준다.", async ({ page }) => {
		await mockUnsubscribe(page, "network-error");

		await page.goto(`/ko${PATHS.unsubscribe}?token=${TOKEN}`);
		await page.getByRole("button", { name: "메일 그만 받기" }).click();

		await expect(page.getByRole("alert")).toContainText("처리하지 못했어요");
	});

	test("토큰이 잘못돼 401이면 잘못된 링크로 보여준다.", async ({ page }) => {
		await mockUnsubscribe(page, {
			status: 401,
			body: { error: "invalid_token" },
		});

		await page.goto(`/ko${PATHS.unsubscribe}?token=broken`);
		await page.getByRole("button", { name: "메일 그만 받기" }).click();

		await expect(
			page.getByRole("heading", { name: "링크가 올바르지 않아요" }),
		).toBeVisible();
	});

	test("토큰이 없으면 처음부터 잘못된 링크로 보여주고 요청하지 않는다.", async ({
		page,
	}) => {
		const requests = await mockUnsubscribe(page, {
			status: 200,
			body: { status: "ok" },
		});

		await page.goto(`/ko${PATHS.unsubscribe}`);

		await expect(
			page.getByRole("heading", { name: "링크가 올바르지 않아요" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "메일 그만 받기" }),
		).toHaveCount(0);
		expect(requests).toHaveLength(0);
	});

	test("검색 노출을 막는 헤더를 내린다.", async ({ page }) => {
		const response = await page.goto(`/ko${PATHS.unsubscribe}?token=${TOKEN}`);

		expect(response?.headers()["x-robots-tag"]).toContain("noindex");
	});
});
