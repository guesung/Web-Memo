import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, openSidePanel } from "../lib";

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
	// 저장 상태 문구는 비로그인에서 저장 전에도 보이므로, 첫 저장 직후에만 뜨는 배너로 저장 완료를 기다린다.
	await expect(sidePanelPage.getByTestId("guest-login-banner")).toBeVisible();

	await sidePanelPage.reload();
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"기기에 쓴 메모",
	);
});

/** 목 페이지를 열고 그 페이지의 사이드 패널을 연다. */
const openGuestPanel = async ({
	page,
	context,
	path,
}: {
	page: Page;
	context: BrowserContext;
	path: string;
}) => {
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Guest banner test</h1>",
		});
	});
	await page.goto(`https://example.com/${path}`);
	await openSidePanel(page);
	return findSidePanelPage(page);
};

/**
 * 첫 저장 배너는 처음 노출될 때 한 번만 뜬다. 두 번째 저장에서는 숨고 다른 세션에서도 다시 뜨지 않는다.
 */
test("비로그인 첫 저장 배너는 첫 저장에 뜨고 두 번째 저장에서 숨으며 다시 열어도 뜨지 않는다 (Mocked)", async ({
	page,
	context,
}) => {
	const sidePanelPage = await openGuestPanel({
		page,
		context,
		path: "guest-banner-once",
	});
	const memoTextarea = sidePanelPage.locator("#memo-textarea");
	const banner = sidePanelPage.getByTestId("guest-login-banner");

	await memoTextarea.fill("첫 저장");
	await expect(banner).toBeVisible();
	await expect(banner).toHaveAttribute("data-variant", "firstSave");

	await memoTextarea.fill("두 번째 저장");
	await expect(banner).toBeHidden();

	await sidePanelPage.reload();
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(
		"두 번째 저장",
	);
	await sidePanelPage.locator("#memo-textarea").fill("세 번째 저장");
	await expect(
		sidePanelPage.getByText(/이 기기에만 저장돼요|saved on this device only/i),
	).toBeVisible();
	await expect(sidePanelPage.getByTestId("guest-login-banner")).toBeHidden();
});

test("비로그인 첫 저장 배너는 닫기 버튼으로 닫을 수 있다 (Mocked)", async ({
	page,
	context,
}) => {
	const sidePanelPage = await openGuestPanel({
		page,
		context,
		path: "guest-banner-close",
	});
	const banner = sidePanelPage.getByTestId("guest-login-banner");

	await sidePanelPage.locator("#memo-textarea").fill("닫기 확인용 메모");
	await expect(banner).toBeVisible();
	await banner.getByRole("button", { name: /^(닫기|close)$/i }).click();
	await expect(banner).toBeHidden();
});

/** 웹 링크는 웹 탭을 열지 않고 로그인 안내 팝오버를 보여 준다. */
test("비로그인에서 웹 링크를 누르면 새 탭 대신 로그인 안내 팝오버가 열린다 (Mocked)", async ({
	page,
	context,
}) => {
	const sidePanelPage = await openGuestPanel({
		page,
		context,
		path: "guest-web-link",
	});
	await sidePanelPage.locator("#memo-textarea").fill("웹 링크 확인용 메모");

	const pageCountBefore = context.pages().length;
	await sidePanelPage
		.getByRole("button", { name: /새 탭에서 열기|open in new tab/i })
		.click();
	const popover = sidePanelPage.getByTestId("guest-web-link-popover");
	await expect(popover).toBeVisible();
	expect(context.pages()).toHaveLength(pageCountBefore);
	await sidePanelPage.keyboard.press("Escape");
	await expect(popover).toBeHidden();
});
