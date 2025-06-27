import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import {
	EXAMPLE_URL,
	gotoSafely,
	LANGUAGE,
	login,
	openSidePanel,
} from "../lib";

const isCI = process.env.CI === "true";

test.describe.configure({ mode: "parallel" });
test.describe("가이드 기능", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});
	test("메모 페이지 최초 접속시, 가이드를 볼 수 있다.", async ({ page }) => {
		await page.waitForURL(new RegExp(PATHS.memos));
		await expect(page.locator("#driver-popover-description")).toHaveText(
			`Ready to start? Press '${isCI ? "Alt" : "Option"} + S' to open the side panel`,
		);
	});
	test("사이드 패널을 열 시, 다음 가이드 페이지로 이동한다.", async ({
		page,
	}) => {
		// 사이드 패널을 열기 위해서는 웹 메모 외의 사이트에 이동해야한다.
		await gotoSafely({
			page,
			url: EXAMPLE_URL,
			regexp: new RegExp(EXAMPLE_URL),
		});

		await openSidePanel(page);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		await expect(page.locator("#driver-popover-description")).toHaveText(
			"Great! Now you can write memos. Don't worry, they save automatically",
		);
	});
	test("새로고침 버튼을 누르면, 가이드가 종료된다.", async ({ page }) => {
		await page.waitForURL(new RegExp(PATHS.memos));

		await page.locator(".driver-popover-next-btn").click();
		await page.locator(".driver-popover-next-btn").click();
		await page.locator("#refresh").click();

		await expect(page.locator("#driver-popover")).toBeHidden();
	});
});
