import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { test as base, chromium } from "@playwright/test";

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const pathToExtension = path.join(path.resolve(), "..", "dist");

type ExtensionFixture = {
	context: BrowserContext;
};

export const test = base.extend<ExtensionFixture>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixture API requires empty destructuring
	context: async ({}, use) => {
		const context = await chromium.launchPersistentContext("", {
			// 확장이 설치 때 여는 `/memos` 탭은 언어 경로가 없어 브라우저 언어(Accept-Language)로
			// 언어가 정해지고, 웹은 그 언어를 `i18next` 쿠키에 쓴다. 개발 기기가 한국어면 이
			// 탭이 쿠키를 ko로 써서, 이후 로그인 콜백(`/memos`)이 `/ko/memos`로 떨어진다.
			locale: "en-US",
			headless: false,
			args: [
				`--headless=new`,
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		});
		await closeInstallTab(context);
		await use(context);
		await context.close();
	},
	baseURL: "http://localhost:3000",
});
export const expect = test.expect;

/** 확장이 설치 직후 여는 웹 메모 페이지(`/memos`)인지 URL 경로로 판별한다. */
const isInstallTab = (page: Page) => {
	try {
		return /\/memos(\/|$)/.test(new URL(page.url()).pathname);
	} catch {
		// 탭이 열리는 도중에는 URL이 비어 있을 수 있다.
		return false;
	}
};

/**
 * 확장 설치(onInstalled: install) 시 열리는 `/memos` 탭을 닫는다.
 * @description 탭은 확장 로드보다 늦게 비동기로 열리므로 URL 기준으로 짧게 기다린다.
 * 각 테스트가 대상으로 삼는 페이지가 설치 탭이 되지 않게 하려는 것이다.
 * 탭이 열리지 않는 환경에서도 제한 시간 뒤에는 그대로 진행한다.
 */
const closeInstallTab = async (context: BrowserContext) => {
	// 설치 탭이 안 열리는 환경에서는 이 5초만큼만 지연된다.
	const deadline = Date.now() + 5000;

	while (Date.now() < deadline) {
		const installTab = context.pages().find(isInstallTab);

		if (installTab) {
			await installTab.close();
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 100));
	}
};
