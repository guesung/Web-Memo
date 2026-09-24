import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { test as base, chromium } from "@playwright/test";
import { supabaseGuardFixture } from "../lib/mocks/supabaseGuard";

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const BASE_URL = "http://localhost:3000";

/** 확장이 설치 탭을 늦게 여는 부하 상황까지 기다리는 최대 시간. 확장이 탭을 안 여는 환경에서는 이만큼만 지연된다. */
const INSTALL_TAB_WAIT_MS = 20000;
const pathToExtension = path.join(path.resolve(), "..", "dist");

type ExtensionFixture = {
	context: BrowserContext;
	/** `*.real.test.ts`가 아니면 목이 처리하지 않은 Supabase 요청을 막고 테스트를 실패시킨다(supabaseGuard.ts). */
	supabaseGuard: undefined;
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
		const installTabWatcher = watchInstallTab(context);

		await installTabWatcher.waitForFirstInstallTab();
		await restoreLanguageCookie(context);
		await use(context);
		installTabWatcher.stop();
		await context.close();
	},
	baseURL: BASE_URL,
	supabaseGuard: [supabaseGuardFixture, { auto: true }],
});
export const expect = test.expect;

/**
 * 확장이 설치 직후 여는 웹 메모 탭인지 판별한다.
 * @description 미로그인이면 `/memos`가 `/ko/login`으로 리다이렉트되어 경로로는 구분할 수 없다.
 * 확장이 붙이는 `ext_cid` 쿼리는 리다이렉트 뒤에도 유지되므로 이것을 기준으로 한다.
 * 테스트가 여는 페이지에는 `ext_cid`가 붙지 않는다. 경로(`/memos`)로는 판별하지 않는다. 테스트 페이지도 그 경로로 가기 때문이다.
 */
const isInstallTab = (page: Page) => {
	try {
		const url = new URL(page.url());

		return url.origin === BASE_URL && url.searchParams.has("ext_cid");
	} catch {
		// 탭이 열리는 도중에는 URL이 비어 있을 수 있다.
		return false;
	}
};

/**
 * 웹이 언어를 기억하는 `i18next` 쿠키를 en으로 다시 쓴다.
 * @description 설치 탭은 언어 경로 없이 열려 브라우저 언어(첫 요청은 locale 설정과 무관하게 ko일 수 있다)로
 * 이동하고, 웹이 그 언어를 이 쿠키에 쓴다. 탭을 닫아도 이미 쓴 쿠키는 남고, 로그인 콜백이 언어 없는
 * `/memos`로 보내므로 남은 ko 쿠키가 `/ko/memos`를 고르게 한다. 이름과 속성은
 * `apps/web/src/modules/i18n`의 `cookieName`과 `util.client.ts`의 `setCookie`를 따른다.
 */
const restoreLanguageCookie = async (context: BrowserContext) => {
	await context.addCookies([
		{
			name: "i18next",
			value: "en",
			url: BASE_URL,
			sameSite: "Strict",
			expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
		},
	]);
};

/**
 * 컨텍스트가 살아 있는 동안 확장이 여는 설치 탭을 감시해 열리는 즉시 닫고 언어 쿠키를 복구한다.
 * @description 설치 탭은 확장 로드보다 늦게 비동기로 열리고, 부하가 크면 대기 시간 뒤에 열리기도 한다.
 * 그래서 이미 열린 탭과 나중에 열리는 탭을 모두 `framenavigated`로 잡는다.
 * `stop` 뒤나 컨텍스트가 닫힌 뒤의 실패는 무시한다.
 */
const watchInstallTab = (context: BrowserContext) => {
	let isWatching = true;
	let resolveFirstInstallTab: () => void = () => {};
	const firstInstallTab = new Promise<void>((resolve) => {
		resolveFirstInstallTab = resolve;
	});

	const closeIfInstallTab = async (page: Page) => {
		if (!isWatching || !isInstallTab(page)) {
			return;
		}

		try {
			await page.close();
			await restoreLanguageCookie(context);
		} catch {
			// 컨텍스트가 이미 닫혔다면 정리할 것이 없다.
		}

		resolveFirstInstallTab();
	};

	const watchPage = (page: Page) => {
		page.on("framenavigated", (frame) => {
			if (frame === page.mainFrame()) {
				void closeIfInstallTab(page);
			}
		});
		void closeIfInstallTab(page);
	};

	for (const page of context.pages()) {
		watchPage(page);
	}
	context.on("page", watchPage);

	return {
		/** 첫 설치 탭을 닫을 때까지, 최대 INSTALL_TAB_WAIT_MS만큼 기다린다. 탭이 일찍 열리면 바로 반환한다. */
		waitForFirstInstallTab: async () => {
			let timeoutId: ReturnType<typeof setTimeout> | undefined;
			const timeout = new Promise<void>((resolve) => {
				timeoutId = setTimeout(resolve, INSTALL_TAB_WAIT_MS);
			});

			await Promise.race([firstInstallTab, timeout]);
			clearTimeout(timeoutId);
		},
		/** 감시를 멈춘다. 컨텍스트를 닫기 직전에 부른다. */
		stop: () => {
			isWatching = false;
			context.off("page", watchPage);
		},
	};
};
