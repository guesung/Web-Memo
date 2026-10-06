import { expect, test } from "../fixtures/extension";
import { findSidePanelPage, login, openSidePanel, skipGuide } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 저장 전 새 메모에서도 상태 아이콘이 눌린 상태로 바뀌고 툴팁이 반대 동작을 알린다. */
test("메모가 없는 페이지에서 위시리스트를 누르면 아이콘이 켜지고 툴팁이 빼기로 바뀐다", async ({
	page,
	context,
}) => {
	const url = "https://example.com/status-toggle-new-memo";
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await context.route("https://example.com/**", async (route) => {
		await route.fulfill({
			contentType: "text/html",
			body: "<h1>Status toggle test</h1>",
		});
	});
	await login(page);
	await skipGuide(page);
	await openSidePanel(page);
	const sidePanelPage = await findSidePanelPage(page);
	await page.goto(url);

	const wishButton = sidePanelPage.getByRole("button", {
		name: /^(Wishlist|위시리스트)$/,
	});
	await expect(wishButton).toBeEnabled();
	await expect(wishButton).toHaveAttribute("aria-pressed", "false");

	await wishButton.click();
	await expect(wishButton).toHaveAttribute("aria-pressed", "true");

	await sidePanelPage.mouse.move(0, 0);
	await wishButton.hover();
	await expect(sidePanelPage.getByRole("tooltip")).toHaveText(
		/^(Remove from wishlist|위시리스트에서 빼기)$/,
	);
});
