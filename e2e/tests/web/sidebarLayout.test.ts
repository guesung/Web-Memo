import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 고정 헤더와 사이드바 행의 레이아웃 계약을 확인한다. */
test("사이드바 탐색과 설정 행이 헤더 아래에서 전체 너비를 채운다", async ({
	page,
}) => {
	await setupSupabaseMocks(page, new MockSupabaseStore());
	await gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});

	const sidebar = page.locator('[data-sidebar="sidebar"]');
	const navigationLinks = sidebar.locator('[data-sidebar="menu-button"]');
	await expect(navigationLinks.first()).toBeVisible();
	await expect(sidebar.locator("#settings")).toBeVisible();
	await expect(page.locator("nextjs-portal [data-issues-count]")).toHaveCount(
		0,
	);

	const dimensions = await page.evaluate(() => {
		const header = document.querySelector("header");
		const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
		const content = sidebarElement?.querySelector('[data-sidebar="content"]');
		const firstLink = sidebarElement?.querySelector(
			'[data-sidebar="menu-button"]',
		);
		const nextLink = sidebarElement?.querySelectorAll(
			'[data-sidebar="menu-button"]',
		)[1];
		const settings = sidebarElement?.querySelector("#settings");
		if (
			!header ||
			!sidebarElement ||
			!content ||
			!firstLink ||
			!nextLink ||
			!settings
		) {
			throw new Error("사이드바의 필수 행을 찾지 못했습니다.");
		}

		const first = firstLink.getBoundingClientRect();
		const next = nextLink.getBoundingClientRect();
		const footer = settings.getBoundingClientRect();
		const sidebarRect = sidebarElement.getBoundingClientRect();
		const headerHeight = header.getBoundingClientRect().height;
		return {
			headerHeight,
			sidebarFirstRowTop: first.top - sidebarRect.top,
			rowHeight: first.height,
			rowWidth: first.width,
			sidebarWidth: sidebarRect.width,
			rowGap: next.top - first.bottom,
			footerHeight: footer.height,
			footerWidth: footer.width,
			scrollbarWidth: getComputedStyle(content, "::-webkit-scrollbar").width,
		};
	});

	expect(dimensions.headerHeight).toBe(48);
	expect(dimensions.sidebarFirstRowTop).toBe(48);
	expect(dimensions.rowHeight).toBe(48);
	expect(dimensions.rowWidth).toBe(dimensions.sidebarWidth);
	expect(dimensions.rowGap).toBe(0);
	expect(dimensions.footerHeight).toBe(48);
	expect(dimensions.footerWidth).toBe(dimensions.sidebarWidth);
	expect(dimensions.scrollbarWidth).toBe("4px");
	await expect(sidebar.locator("#settings")).toHaveCount(1);

	await page.setViewportSize({ width: 1280, height: 360 });
	const sidebarContent = sidebar.locator('[data-sidebar="content"]');
	const scrollState = await sidebarContent.evaluate((element) => {
		const isOverflowing = element.scrollHeight > element.clientHeight;
		element.scrollTop = 100;

		return { isOverflowing, scrollTop: element.scrollTop };
	});
	expect(scrollState.isOverflowing).toBe(true);
	expect(scrollState.scrollTop).toBeGreaterThan(0);
});
