import type { Page, Request } from "@playwright/test";
import { PATHS, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 피드백 저장(`feedback` 스키마의 feedbacks 테이블) 요청 URL 패턴입니다. */
const FEEDBACK_URL = `${SUPABASE.url}/rest/v1/feedbacks**`;

const SUBMIT_BUTTON_NAME = "보내기";
const THANKS_TITLE = "의견 보내주셔서 고마워요";
const ERROR_MESSAGE = "지금은 보내지 못했어요. 잠시 뒤에 다시 눌러주세요";

// 로그인 여부와 무관해야 하는 화면이므로 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * 피드백 저장 요청을 가로채 기록한다.
 * @param status 응답 상태 코드. 2xx면 저장 성공으로 취급한다.
 * @param delayMs 응답을 늦출 시간(ms)
 * @returns 가로챈 요청 목록
 */
const interceptFeedbackRequests = async (
	page: Page,
	{ status = 201, delayMs = 0 }: { status?: number; delayMs?: number } = {},
) => {
	const requests: Request[] = [];

	await page.route(FEEDBACK_URL, async (route) => {
		if (route.request().method() !== "POST") {
			await route.fallback();
			return;
		}

		requests.push(route.request());
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		await route.fulfill({
			status,
			contentType: "application/json",
			body: status >= 400 ? JSON.stringify({ message: "boom" }) : "",
		});
	});

	return requests;
};

test.describe.configure({ mode: "parallel" });
test.describe("확장 삭제 사유 설문", () => {
	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	test("도착하면 사유가 선택되어 있지 않고 보내기 버튼이 비활성이다.", async ({
		page,
	}) => {
		await page.goto(`/ko${PATHS.uninstall}`);

		await expect(page.getByRole("radio")).toHaveCount(6);
		await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: SUBMIT_BUTTON_NAME, exact: true }),
		).toBeDisabled();
	});

	test("사유를 고르면 보내기 버튼이 활성화된다.", async ({ page }) => {
		await page.goto(`/ko${PATHS.uninstall}`);

		await page.getByRole("radio", { name: "쓸 일이 없었어요" }).click();

		await expect(
			page.getByRole("button", { name: SUBMIT_BUTTON_NAME, exact: true }),
		).toBeEnabled();
	});

	test("서술을 비우고 보내면 빈 feedback으로 저장하고 감사 화면을 보여준다.", async ({
		page,
	}) => {
		const requests = await interceptFeedbackRequests(page);
		await page.goto(`/ko${PATHS.uninstall}`);

		await page.getByRole("radio", { name: "쓰기 어려웠어요" }).click();
		await page
			.getByRole("button", { name: SUBMIT_BUTTON_NAME, exact: true })
			.click();

		await expect(page.getByText(THANKS_TITLE)).toBeVisible();
		await expect(page.locator("form")).toHaveCount(0);
		await expect(page.locator("main").getByRole("button")).toHaveCount(0);
		await expect(page.locator("main").getByRole("link")).toHaveCount(0);

		expect(requests).toHaveLength(1);
		const payload = requests[0].postDataJSON();
		expect(payload.email).toBeNull();

		const content = JSON.parse(payload.content);
		expect(content.type).toBe("uninstall");
		expect(content.reason).toBe("hard_to_use");
		expect(content.feedback).toBe("");
		expect(new Date(content.timestamp).toISOString()).toBe(content.timestamp);
	});

	test("서술을 적어 보내면 그 문장이 그대로 저장된다.", async ({ page }) => {
		const requests = await interceptFeedbackRequests(page);
		await page.goto(`/ko${PATHS.uninstall}`);

		await page.getByRole("radio", { name: "그 외" }).click();
		await page
			.getByLabel("더 남기고 싶은 말이 있어요?")
			.fill("  단축키가 아쉬웠어요 ");
		await page
			.getByRole("button", { name: SUBMIT_BUTTON_NAME, exact: true })
			.click();

		await expect(page.getByText(THANKS_TITLE)).toBeVisible();
		const content = JSON.parse(requests[0].postDataJSON().content);
		expect(content.reason).toBe("other");
		expect(content.feedback).toBe("단축키가 아쉬웠어요");
	});

	test("저장에 실패하면 안내를 보여주고 입력을 유지하며 다시 보낼 수 있다.", async ({
		page,
	}) => {
		await interceptFeedbackRequests(page, { status: 500 });
		await page.goto(`/ko${PATHS.uninstall}`);

		await page.getByRole("radio", { name: "다른 걸 쓰게 됐어요" }).click();
		await page.getByLabel("더 남기고 싶은 말이 있어요?").fill("다른 앱");
		await page
			.getByRole("button", { name: SUBMIT_BUTTON_NAME, exact: true })
			.click();

		await expect(page.locator("main").getByRole("alert")).toContainText(
			ERROR_MESSAGE,
		);
		await expect(page.getByText("boom")).toHaveCount(0);
		await expect(
			page.getByRole("radio", { name: "다른 걸 쓰게 됐어요" }),
		).toBeChecked();
		await expect(page.getByLabel("더 남기고 싶은 말이 있어요?")).toHaveValue(
			"다른 앱",
		);
		await expect(
			page.getByRole("button", { name: SUBMIT_BUTTON_NAME, exact: true }),
		).toBeEnabled();
	});

	test("제출 중에 여러 번 눌러도 요청은 한 번만 간다.", async ({ page }) => {
		const requests = await interceptFeedbackRequests(page, { delayMs: 800 });
		await page.goto(`/ko${PATHS.uninstall}`);

		await page.getByRole("radio", { name: "쓸 일이 없었어요" }).click();
		const submitButton = page.getByRole("button", {
			name: SUBMIT_BUTTON_NAME,
			exact: true,
		});
		await submitButton.click();

		await expect(page.getByText("보내는 중이에요")).toBeVisible();
		await expect(page.getByRole("radio").first()).toBeDisabled();
		await page
			.getByRole("button", { name: "보내는 중이에요" })
			.click({ force: true });

		await expect(page.getByText(THANKS_TITLE)).toBeVisible();
		expect(requests).toHaveLength(1);
	});

	test("영어 경로는 영어 문구로 보인다.", async ({ page }) => {
		await page.goto(`/en${PATHS.uninstall}`);

		await expect(
			page.getByRole("heading", { name: "You removed Web Memo" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Send", exact: true }),
		).toBeDisabled();
	});
});
