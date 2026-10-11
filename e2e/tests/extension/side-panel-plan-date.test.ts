import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

const TOMORROW_LABEL = /^(내일|Tomorrow)$/;

/** 오늘이 아니라 테스트가 도는 기기의 로컬 날짜로 내일 키(YYYY-MM-DD)를 만든다. */
const getTomorrowKey = () => {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
	const day = String(tomorrow.getDate()).padStart(2, "0");

	return `${tomorrow.getFullYear()}-${month}-${day}`;
};

test("읽는 중 다음에 계획 날짜 버튼이 있고, 내일을 고르면 라벨과 토스트가 뜨고 해제하면 사라진다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/side-panel-plan-date";
	const store = new MockSupabaseStore();
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Plan date test</h1>",
		});
	});
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(url);

	const readingButton = sidePanelPage.getByRole("button", {
		name: /^(Reading|읽는 중)$/,
	});
	const planButton = sidePanelPage.getByTestId("plan-date-button");
	await expect(planButton).toBeEnabled();
	await expect(sidePanelPage.getByTestId("plan-date-label")).toHaveCount(0);

	const readingBox = await readingButton.boundingBox();
	const planBox = await planButton.boundingBox();
	expect(planBox?.x).toBeGreaterThan(readingBox?.x ?? Number.POSITIVE_INFINITY);

	await planButton.click();
	await sidePanelPage.getByTestId("plan-quick-tomorrow").click();

	await expect(sidePanelPage.getByTestId("plan-date-picker")).toHaveCount(0);
	await expect(sidePanelPage.getByTestId("plan-date-label")).toHaveText(
		TOMORROW_LABEL,
	);
	await expect(
		sidePanelPage.getByText(/볼 목록에 담았어요|reading list/).first(),
	).toBeVisible();
	await expect
		.poll(() => store.getAllMemos().map((memo) => memo.plannedDate))
		.toContain(getTomorrowKey());

	await planButton.click();
	await sidePanelPage.getByTestId("plan-date-clear").click();

	await expect(sidePanelPage.getByTestId("plan-date-label")).toHaveCount(0);
	await expect(
		sidePanelPage
			.getByText(/읽을 계획에서 뺐어요|Removed from your reading plan/)
			.first(),
	).toBeVisible();
	await expect
		.poll(() => store.getAllMemos().map((memo) => memo.plannedDate))
		.not.toContain(getTomorrowKey());
});
