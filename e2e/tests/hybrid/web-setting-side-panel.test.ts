import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import {
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

test("웹 설정에서 두 메모 필드를 켜고 꺼도 열린 패널의 값이 유지된다 (Mocked)", async ({
	page,
	baseURL,
}) => {
	const settingUrl = new URL(`/en${PATHS.memosSetting}`, baseURL).href;
	const store = new MockSupabaseStore();
	store.setSetting(createMockSetting());
	store.addMemo(
		createMockMemo({
			url: settingUrl,
			memo: "설정 전 메모",
			impression: "저장된 느낀 점",
			actionItem: "저장된 액션 아이템",
		}),
	);
	await setupSupabaseMocks(page, store);
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(settingUrl);
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"설정 전 메모",
	);
	const impression = sidePanelPage.locator("#impression-textarea");
	const actionItem = sidePanelPage.locator("#action-item-textarea");
	await expect(impression).toHaveCount(0);
	await expect(actionItem).toHaveCount(0);

	for (const [switchId, field, value] of [
		["show-impression", impression, "저장된 느낀 점"],
		["show-action-item", actionItem, "저장된 액션 아이템"],
	] as const) {
		const settingSwitch = page.locator(`#${switchId}`);
		// SSR 버튼은 보이더라도 React가 이벤트를 연결하기 전의 클릭은 무시된다.
		await expect
			.poll(() =>
				settingSwitch.evaluate((element) =>
					Object.keys(element).some((key) => key.startsWith("__reactProps$")),
				),
			)
			.toBe(true);
		await settingSwitch.click();
		await expect(settingSwitch).toBeChecked();
		await expect(field).toHaveValue(value);
		await settingSwitch.click();
		await expect(settingSwitch).not.toBeChecked();
		await expect(field).toHaveCount(0);
		await settingSwitch.click();
		await expect(field).toHaveValue(value);
	}

	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"설정 전 메모",
	);
});
