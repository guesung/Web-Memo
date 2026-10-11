import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 브라우저와 같은 로컬 시간대로 오늘에서 `offsetDays`일 뒤의 `YYYY-MM-DD`를 만든다. */
const getLocalDateKey = (offsetDays = 0) => {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);

	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
};

const PLAN_URL = `${LANGUAGE}${PATHS.memosPlan}`;

test.describe("읽을 계획 탭 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
	});

	test("사이드바의 읽을 계획 항목으로 이동하고, 작성일별 보기 전환은 숨긴다.", async ({
		page,
	}) => {
		store.addMemo(
			createMockMemo({ title: "일반 메모", plannedDate: getLocalDateKey(1) }),
		);

		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await expect(
			page.getByRole("button", { name: "By created date" }),
		).toBeVisible();

		await page.getByRole("link", { name: "Reading plan", exact: true }).click();

		await expect(page).toHaveURL(new RegExp(`${PATHS.memosPlan}$`));
		await expect(page.getByTestId("plan-list")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "By created date" }),
		).toHaveCount(0);
	});

	test("지난 계획·오늘·다가오는 날로 나누고, 지난 계획은 접힌 채 시작한다.", async ({
		page,
	}) => {
		store.addMemo(
			createMockMemo({ title: "지난 글", plannedDate: getLocalDateKey(-2) }),
		);
		store.addMemo(
			createMockMemo({ title: "오늘 글", plannedDate: getLocalDateKey(0) }),
		);
		store.addMemo(
			createMockMemo({ title: "내일 글", plannedDate: getLocalDateKey(1) }),
		);
		store.addMemo(
			createMockMemo({ title: "다음 주 글", plannedDate: getLocalDateKey(7) }),
		);
		store.addMemo(createMockMemo({ title: "계획 없는 글" }));

		await gotoSafely({
			page,
			url: PLAN_URL,
			regexp: new RegExp(PATHS.memosPlan),
		});

		const todaySection = page.getByTestId("plan-section-today");
		const upcomingSection = page.getByTestId("plan-section-upcoming");
		const pastSection = page.getByTestId("plan-section-past");

		await expect(todaySection.locator(".memo-item")).toHaveCount(1);
		await expect(todaySection).toContainText("오늘 글");
		await expect(upcomingSection.locator(".memo-item")).toHaveCount(2);
		await expect(
			upcomingSection.getByTestId("memo-date-group").first(),
		).toContainText("내일 글");
		await expect(
			upcomingSection.getByTestId("memo-date-group").last(),
		).toContainText("다음 주 글");
		await expect(page.getByText("계획 없는 글")).toHaveCount(0);

		await expect(pastSection).toContainText("Past plans (1)");
		await expect(pastSection.locator(".memo-item")).toHaveCount(0);
		await pastSection.getByRole("button", { name: /Past plans/ }).click();
		await expect(pastSection).toContainText("지난 글");
	});

	test("오늘 계획이 없어도 오늘 구역을 보여주고, 비면 지난·다가오는 구역은 숨긴다.", async ({
		page,
	}) => {
		store.addMemo(
			createMockMemo({ title: "내일 글", plannedDate: getLocalDateKey(1) }),
		);

		await gotoSafely({
			page,
			url: PLAN_URL,
			regexp: new RegExp(PATHS.memosPlan),
		});

		await expect(page.getByTestId("plan-section-today")).toContainText(
			"Nothing to read today",
		);
		await expect(page.getByTestId("plan-section-upcoming")).toBeVisible();
		await expect(page.getByTestId("plan-section-past")).toHaveCount(0);
	});

	test("계획이 하나도 없으면 안내와 전체 메모 보기 링크를 보여준다.", async ({
		page,
	}) => {
		store.addMemo(createMockMemo({ title: "계획 없는 글" }));

		await gotoSafely({
			page,
			url: PLAN_URL,
			regexp: new RegExp(PATHS.memosPlan),
		});

		const emptyState = page.getByTestId("plan-empty-state");
		await expect(emptyState).toContainText("No dates picked yet");
		await emptyState.getByRole("link", { name: "View all memos" }).click();

		await expect(page).toHaveURL(new RegExp(`${PATHS.memos}$`));
	});

	test("검색 결과가 없으면 계획 빈 상태 대신 검색 빈 상태를 보여준다.", async ({
		page,
	}) => {
		store.addMemo(
			createMockMemo({ title: "내일 글", plannedDate: getLocalDateKey(1) }),
		);

		await gotoSafely({
			page,
			url: PLAN_URL,
			regexp: new RegExp(PATHS.memosPlan),
		});
		await page.getByPlaceholder("Search memos").fill("없는검색어");

		await expect(page.getByText("No results")).toBeVisible();
		await expect(page.getByTestId("plan-empty-state")).toHaveCount(0);
	});
});
