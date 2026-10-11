import { getExtensionUrl, PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/extension";
import { gotoSafely, LANGUAGE, login, skipGuide } from "../lib";
import {
	createMockHighlight,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

test("URL 카드 제목 클릭 한 번으로 원문 새 탭과 확장 사이드 패널을 연다", async ({
	page,
	context,
}) => {
	const store = new MockSupabaseStore();
	store.addHighlight(
		createMockHighlight({
			url: "https://example.com/article",
			exact_text: "Saved quote",
		}),
	);
	await setupSupabaseMocks(page, store);
	await context.route("https://example.com/article", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: "<title>Source page</title>",
		}),
	);
	await login(page);
	await skipGuide(page);
	await gotoSafely({
		page,
		url: `/${LANGUAGE}${PATHS.highlights}`,
		regexp: new RegExp(PATHS.highlights),
	});
	const header = page.getByRole("link", { name: "Open source and memo panel" });
	await expect(header).toHaveAttribute("href", "https://example.com/article");
	const popupPromise = page.waitForEvent("popup");
	await header.click();
	const popup = await popupPromise;
	await expect(popup).toHaveURL("https://example.com/article");
	await expect
		.poll(() =>
			context
				.pages()
				.some((tab) => tab.url() === getExtensionUrl("side-panel/index.html")),
		)
		.toBe(true);
	await expect(
		page.getByText("Could not open the side panel. Check the extension."),
	).toHaveCount(0);
	await popup.close();
});
