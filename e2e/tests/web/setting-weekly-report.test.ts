import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely } from "../lib";
import {
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 설정 화면의 주간 리포트 카드.
 * 로그인은 실제 세션이라 로그인 이메일 값은 고정할 수 없다. 켤 때 입력칸에 채워진 값과
 * 저장 요청 body가 같은지로 "로그인 이메일로 저장"을 확인한다.
 */
test.describe("설정 주간 리포트 (Mocked)", () => {
	let store: MockSupabaseStore;

	const openSetting = async (
		page: Page,
		setting: ReturnType<typeof createMockSetting> | null,
	) => {
		store = new MockSupabaseStore();
		store.setSetting(setting);
		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `/ko${PATHS.memosSetting}`,
			regexp: new RegExp(PATHS.memosSetting),
		});
		await expect(page.getByText("리포트 메일 받기")).toBeVisible();
	};

	const emailInput = (page: Page) => page.getByLabel("받을 이메일");
	// 토스트는 Radix ToastViewport(role="region") 안에 뜬다. 같은 문구가 스크린리더용
	// role="status" 공지 영역에도 한 번 더 들어가므로 페이지 전체에서 텍스트로 찾으면 둘이 걸린다.
	const toastRegion = (page: Page) =>
		page.getByRole("region", { name: /notifications/i });
	const testButton = (page: Page) =>
		page.getByRole("button", { name: "테스트 메일 보내기" });

	test("기본은 켜져 있고 받을 이메일 칸에 로그인 이메일이 보인다.", async ({
		page,
	}) => {
		await openSetting(page, null);

		await expect(
			page.getByRole("switch", { name: "리포트 메일 받기" }),
		).toBeChecked();
		expect(await emailInput(page).inputValue()).toMatch(EMAIL_PATTERN);
		await expect(testButton(page)).toBeEnabled();
		expect(store.settingUpserts).toEqual([]);
	});

	test("카드는 카테고리 카드 다음, 데이터 카드 앞에 있다.", async ({
		page,
	}) => {
		await openSetting(page, null);

		const getTop = async (title: string) => {
			const box = await page.getByText(title, { exact: true }).boundingBox();
			return box?.y ?? Number.NaN;
		};
		const [categoryTop, reportTop, dataTop] = await Promise.all([
			getTop("메모를 묶는 카테고리를 관리해요"),
			getTop("매주 일요일 저녁, 그 주에 쓴 메모를 메일로 보내 드려요"),
			getTop("메모 전체를 파일로 내려받아요"),
		]);

		expect(categoryTop).toBeLessThan(reportTop);
		expect(reportTop).toBeLessThan(dataTop);
	});

	test("주소가 없을 때 켜면 로그인 이메일로 저장하고 입력칸에 채운다.", async ({
		page,
	}) => {
		await openSetting(
			page,
			createMockSetting({ weekly_report_enabled: false }),
		);

		await page.getByRole("switch", { name: "리포트 메일 받기" }).click();

		await expect(emailInput(page)).toBeVisible();
		const filled = await emailInput(page).inputValue();
		expect(filled).toMatch(EMAIL_PATTERN);
		expect(store.settingUpserts).toEqual([
			{ weekly_report_enabled: true, weekly_report_email: filled },
		]);
	});

	test("저장된 주소가 있으면 켤 때 주소 키를 보내지 않고, 끌 때도 켜짐 값만 보낸다.", async ({
		page,
	}) => {
		await openSetting(
			page,
			createMockSetting({
				weekly_report_enabled: false,
				weekly_report_email: "saved@example.com",
			}),
		);

		await page.getByRole("switch", { name: "리포트 메일 받기" }).click();
		await expect(emailInput(page)).toHaveValue("saved@example.com");

		await page.getByRole("switch", { name: "리포트 메일 받기" }).click();
		await expect(emailInput(page)).toHaveCount(0);

		expect(store.settingUpserts).toEqual([
			{ weekly_report_enabled: true },
			{ weekly_report_enabled: false },
		]);
	});

	test("형식이 틀리면 저장하지 않고 오류를 보이며 테스트 메일을 막는다.", async ({
		page,
	}) => {
		await openSetting(
			page,
			createMockSetting({
				weekly_report_enabled: true,
				weekly_report_email: "saved@example.com",
			}),
		);

		await emailInput(page).fill("not-an-email");
		await emailInput(page).blur();

		await expect(page.getByText("이메일 형식을 확인해 주세요")).toBeVisible();
		await expect(emailInput(page)).toHaveAttribute("aria-invalid", "true");
		await expect(testButton(page)).toBeDisabled();
		expect(store.settingUpserts).toHaveLength(0);
	});

	test("올바른 주소로 바꾸고 Enter를 누르면 저장하고, 같은 값이면 요청하지 않는다.", async ({
		page,
	}) => {
		await openSetting(
			page,
			createMockSetting({
				weekly_report_enabled: true,
				weekly_report_email: "saved@example.com",
			}),
		);

		await expect(emailInput(page)).toHaveValue("saved@example.com");
		await emailInput(page).fill("new@example.com");
		await expect(emailInput(page)).toHaveValue("new@example.com");
		await expect(testButton(page)).toBeDisabled();
		await emailInput(page).press("Enter");
		await expect(
			toastRegion(page).getByText("변경사항을 저장했어요"),
		).toBeVisible();
		expect(store.settingUpserts).toEqual([
			{ weekly_report_email: "new@example.com" },
		]);

		await emailInput(page).focus();
		await emailInput(page).blur();
		expect(store.settingUpserts).toHaveLength(1);
	});

	test("테스트 메일을 보내면 body에 test 모드를 싣고 성공 토스트를 보인다.", async ({
		page,
	}) => {
		await openSetting(
			page,
			createMockSetting({
				weekly_report_enabled: true,
				weekly_report_email: "saved@example.com",
			}),
		);
		store.weeklyReportTestResponse = {
			status: 200,
			body: { status: "ok", email: "saved@example.com" },
		};

		await testButton(page).click();

		await expect(
			toastRegion(page).getByText("saved@example.com로 보냈어요"),
		).toBeVisible();
		expect(store.weeklyReportTestRequests).toEqual([{ mode: "test" }]);
	});

	test("테스트 메일이 429이면 잠시 뒤에 다시 보내라고 안내한다.", async ({
		page,
	}) => {
		await openSetting(
			page,
			createMockSetting({
				weekly_report_enabled: true,
				weekly_report_email: "saved@example.com",
			}),
		);
		store.weeklyReportTestResponse = {
			status: 429,
			body: { error: "rate_limited" },
		};

		await testButton(page).click();

		await expect(
			toastRegion(page).getByText("조금 뒤에 다시 보내 주세요"),
		).toBeVisible();
	});
});
