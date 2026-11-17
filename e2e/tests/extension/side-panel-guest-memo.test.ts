import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, openSidePanel, skipGuide } from "../lib";

/**
 * 로그인하지 않아도 패널에서 메모를 쓸 수 있고, 메모는 이 기기에만 저장된다.
 * 로그인 안내 화면이 메모 화면을 막지 않고, 헤더 [로그인] 버튼이 로그인 방법 메뉴를 여는 진입점이다.
 */
test("로그인하지 않아도 메모를 쓰면 이 기기에 저장되고 다시 열어도 남아 있다 (Mocked)", async ({
	page,
	context,
}) => {
	const url = "https://example.com/guest-memo";
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Guest memo test</h1>",
		});
	});
	await skipGuide(page);
	await page.goto(url);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	const memoTextarea = sidePanelPage.locator("#memo-textarea");

	await expect(memoTextarea).toBeEditable();
	const loginButton = sidePanelPage.getByRole("button", {
		name: /^(로그인|log in)$/i,
	});
	await expect(loginButton).toBeVisible();
	await loginButton.click();
	await expect(
		sidePanelPage.getByRole("menuitem", {
			name: /카카오로 시작하기|continue with kakao/i,
		}),
	).toBeVisible();
	await expect(
		sidePanelPage.getByRole("menuitem", {
			name: /Google로 시작하기|continue with google/i,
		}),
	).toBeVisible();
	await sidePanelPage.keyboard.press("Escape");
	await expect(
		sidePanelPage.getByText(/이 기기에만 저장돼요|saved on this device only/i),
	).toBeVisible();

	await memoTextarea.fill("기기에 쓴 메모");
	await expect(
		sidePanelPage.getByText(/이 기기에만 저장돼요|saved on this device only/i),
	).toBeVisible();

	await sidePanelPage.reload();
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"기기에 쓴 메모",
	);
});
