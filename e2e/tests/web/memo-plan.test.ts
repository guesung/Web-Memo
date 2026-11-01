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

/** 토스트에 쓰이는 "October 13" 모양의 월·일. */
const formatToastDate = (offsetDays: number) => {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);

	return new Intl.DateTimeFormat(LANGUAGE, {
		month: "long",
		day: "numeric",
	}).format(date);
};

const PLAN_URL = `${LANGUAGE}${PATHS.memosPlan}`;
const PLAN_BUTTON_NAME = "Pick a day to read";

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

test.describe("카드에서 읽을 계획 날짜 정하기 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
	});

	test("달력 버튼으로 내일을 고르면 팝오버가 닫히고 칩과 토스트가 뜨며, 카드 상세는 열리지 않는다.", async ({
		page,
	}) => {
		store.addMemo(createMockMemo({ title: "계획할 글" }));
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		const memoCard = page.locator(".memo-item", { hasText: "계획할 글" });
		await expect(memoCard.getByTestId("plan-date-chip")).toHaveCount(0);

		// 달력 버튼은 카드에 마우스를 올려야 나타난다.
		await memoCard.hover();
		await memoCard.getByRole("button", { name: PLAN_BUTTON_NAME }).click();
		await expect(page.getByTestId("plan-date-picker")).toBeVisible();
		await page.getByTestId("plan-quick-tomorrow").click();

		await expect(page.getByTestId("plan-date-picker")).toBeHidden();
		await expect(memoCard.getByTestId("plan-date-chip")).toHaveText(
			"Read tomorrow",
		);
		await expect(
			page.getByText(`Added to your ${formatToastDate(1)} reading list`, {
				exact: true,
			}),
		).toBeVisible();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page).not.toHaveURL(/[?&]id=/);

		await page.getByRole("link", { name: "Reading plan", exact: true }).click();
		await expect(
			page.getByTestId("plan-section-upcoming").locator(".memo-item"),
		).toHaveCount(1);
	});

	test("토스트의 되돌리기를 누르면 이전 상태로 돌아간다.", async ({ page }) => {
		store.addMemo(createMockMemo({ title: "계획할 글" }));
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		const memoCard = page.locator(".memo-item", { hasText: "계획할 글" });
		// 달력 버튼은 카드에 마우스를 올려야 나타난다.
		await memoCard.hover();
		await memoCard.getByRole("button", { name: PLAN_BUTTON_NAME }).click();
		await page.getByTestId("plan-quick-today").click();
		await expect(memoCard.getByTestId("plan-date-chip")).toHaveText(
			"Read today",
		);

		await page.getByRole("button", { name: "Undo" }).click();

		await expect(memoCard.getByTestId("plan-date-chip")).toHaveCount(0);
	});

	test("칩을 눌러 같은 팝오버를 열고 날짜를 해제하면 칩이 사라지고 토스트가 뜬다.", async ({
		page,
	}) => {
		store.addMemo(
			createMockMemo({ title: "계획된 글", plannedDate: getLocalDateKey(3) }),
		);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		const memoCard = page.locator(".memo-item", { hasText: "계획된 글" });
		await expect(memoCard.getByTestId("plan-date-chip")).toContainText("Read ");
		await memoCard.getByTestId("plan-date-chip").click();
		await expect(page.getByTestId("plan-date-picker")).toBeVisible();
		await expect(page).not.toHaveURL(/[?&]id=/);

		await page.getByTestId("plan-date-clear").click();

		await expect(memoCard.getByTestId("plan-date-chip")).toHaveCount(0);
		await expect(
			page.getByText("Removed from your reading plan", { exact: true }),
		).toBeVisible();
	});

	test("다이얼로그 안에서 날짜를 정해도 다이얼로그는 닫히지 않는다.", async ({
		page,
	}) => {
		store.addMemo(createMockMemo({ title: "상세에서 계획할 글" }));
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		await page.locator(".memo-item", { hasText: "상세에서 계획할 글" }).click();
		// 팝오버 콘텐츠도 role=dialog라 상세 다이얼로그만 메모 입력창으로 좁힌다.
		const dialog = page
			.getByRole("dialog")
			.filter({ has: page.getByTestId("memo-textarea") });
		await expect(dialog).toBeVisible();

		await dialog.getByRole("button", { name: PLAN_BUTTON_NAME }).click();
		await page.getByTestId("plan-quick-tomorrow").click();

		await expect(dialog.getByTestId("plan-date-chip")).toHaveText(
			"Read tomorrow",
		);
		await expect(dialog).toBeVisible();
	});
});
