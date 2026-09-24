import { getExtensionUrl, SUPABASE } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures";
import { login, skipGuide } from "../lib";

/** 설정 저장 실패와 재시도는 실제 계정의 설정을 수정하지 않고 검증한다. */
test("메모 입력 항목 저장에 실패하면 이전 값으로 돌아가고 재시도로 저장된다.", async ({
	page,
}) => {
	await login(page);
	await skipGuide(page);

	let showImpression = false;
	let failNextSave = true;
	let saveAttempts = 0;
	await page
		.context()
		.route(`${SUPABASE.url}/rest/v1/setting**`, async (route) => {
			const method = route.request().method();
			if (method === "GET") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: 1,
						user_id: "test-user-id",
						show_impression: showImpression,
						show_action_item: false,
					}),
				});

				return;
			}

			if (method === "POST" || method === "PATCH") {
				saveAttempts += 1;
				if (failNextSave) {
					failNextSave = false;
					await route.fulfill({
						status: 503,
						contentType: "application/json",
						body: JSON.stringify({ message: "Temporary save failure" }),
					});

					return;
				}

				const requestBody = route.request().postDataJSON();
				showImpression = requestBody.show_impression;
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: 1,
						user_id: "test-user-id",
						show_impression: showImpression,
						show_action_item: false,
					}),
				});

				return;
			}

			await route.abort();
		});

	const optionsPage = await page.context().newPage();
	await optionsPage.goto(getExtensionUrl("options/index.html"));

	const impressionSwitch = optionsPage.locator("#show-impression");
	await expect(impressionSwitch).toHaveAttribute("data-state", "unchecked");
	await impressionSwitch.click();
	await expect(impressionSwitch).toHaveAttribute("data-state", "unchecked");
	await expect(
		optionsPage.getByRole("button", { name: /^(Retry|다시 시도)$/ }),
	).toBeVisible();
	await expect.poll(() => saveAttempts).toBe(1);

	await optionsPage
		.getByRole("button", { name: /^(Retry|다시 시도)$/ })
		.click();
	await expect(impressionSwitch).toHaveAttribute("data-state", "checked");
	await expect.poll(() => saveAttempts).toBe(2);

	await optionsPage.reload();
	await expect(optionsPage.locator("#show-impression")).toHaveAttribute(
		"data-state",
		"checked",
	);
});
