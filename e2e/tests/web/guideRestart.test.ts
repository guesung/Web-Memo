import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

test.describe("가이드 다시 보기 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		await setupSupabaseMocks(page, new MockSupabaseStore());
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memosSetting}`,
			regexp: new RegExp(PATHS.memosSetting),
		});
	});

	test("확장이 감지되지 않으면 이동하지 않고 사유를 안내한다.", async ({
		page,
	}) => {
		await expect(page.getByRole("status")).toHaveCount(0);

		await page.getByRole("button", { name: "Restart guide" }).click();

		await expect(page.getByRole("status")).toContainText(
			"extension wasn't detected",
		);
		await expect(page).toHaveURL(new RegExp(PATHS.memosSetting));
	});
});
