import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 목록 카드 본문의 URL은 새 탭 링크가 되고, 글머리 줄은 둘째 줄부터 들여쓴다. */
test.describe("메모 카드 본문 서식 (Mocked)", () => {
	const LINK = "https://example.com/retro";
	const MEMO = [
		"1. 배포 전에 체크리스트 돌리기 (스테이징 확인 포함해서 꼭 두 번, 줄이 넘어가도록 길게 적은 항목)",
		`- 참고 ${LINK}`,
		"그냥 문장",
	].join("\n");

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		store.setSetting(createMockSetting({ truncate_memo_content: false }));
		store.addMemo(createMockMemo({ title: "팀 회고 정리", memo: MEMO }));

		await setupSupabaseMocks(page, store);
		await page
			.context()
			.route(`${LINK}*`, (route) =>
				route.fulfill({ contentType: "text/html", body: "<p>retro</p>" }),
			);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
		await expect(page.locator(".memo-item").first()).toBeVisible();
	});

	test("본문의 링크를 누르면 새 탭으로 열리고 카드 상세는 열리지 않는다.", async ({
		page,
	}) => {
		const link = page.locator(".memo-item").first().getByRole("link", {
			name: LINK,
		});

		const [popup] = await Promise.all([
			page.context().waitForEvent("page"),
			link.click(),
		]);

		await expect(popup).toHaveURL(LINK);
		await popup.close();
		await expect(page).not.toHaveURL(/[?&]id=/);
		await expect(page.getByRole("dialog")).toHaveCount(0);
	});

	test("글머리 줄은 둘째 줄부터 글머리 뒤에 맞춰 들여쓴다.", async ({
		page,
	}) => {
		const card = page.locator(".memo-item").first();
		const listLine = card.locator("span.block", { hasText: "1. 배포 전에" });
		const plainLine = card.locator("span.block", { hasText: "그냥 문장" });

		const [listIndent, plainIndent] = await Promise.all([
			listLine.evaluate((element) => getComputedStyle(element).paddingLeft),
			plainLine.evaluate((element) => getComputedStyle(element).paddingLeft),
		]);

		expect(Number.parseFloat(listIndent)).toBeGreaterThan(0);
		expect(plainIndent).toBe("0px");
	});
});
