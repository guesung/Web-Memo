import { cp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import type { TStoreLanguage } from "./demoData";

// 확장이 여는 사이드 패널은 Playwright가 기본으로 붙지 않는 타깃이라, 붙도록 켠다(tests/fixtures/extension.ts와 같다).
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

/**
 * 언어를 고정한 확장 사본을 올린 크로미움을 띄운다.
 * @description macOS 크로미움은 `--lang`을 무시하고 시스템 언어로 `chrome.i18n`을 고른다. 그래서 레포 루트의 dist를
 * `.tmp/extension-<언어>`로 복사해 해당 언어의 `_locales`만 남기고 `default_locale`을 그 언어로 바꾼다.
 * 매니페스트의 key가 같아 확장 id는 그대로다.
 */
export const launchExtensionContext = async (language: TStoreLanguage) => {
	const sourceDirectory = path.join(__dirname, "..", "..", "dist");
	const extensionDirectory = path.join(
		__dirname,
		".tmp",
		`extension-${language}`,
	);
	const manifestPath = path.join(extensionDirectory, "manifest.json");

	await rm(extensionDirectory, { recursive: true, force: true });
	await cp(sourceDirectory, extensionDirectory, { recursive: true });

	for (const localeDirectory of ["ko", "en"]) {
		if (localeDirectory !== language) {
			await rm(path.join(extensionDirectory, "_locales", localeDirectory), {
				recursive: true,
				force: true,
			});
		}
	}

	const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	await writeFile(
		manifestPath,
		JSON.stringify({ ...manifest, default_locale: language }),
	);

	const context = await chromium.launchPersistentContext("", {
		locale: language === "ko" ? "ko-KR" : "en-US",
		deviceScaleFactor: 2,
		colorScheme: "light",
		headless: false,
		args: [
			"--headless=new",
			`--accept-lang=${language === "ko" ? "ko-KR" : "en-US"}`,
			`--disable-extensions-except=${extensionDirectory}`,
			`--load-extension=${extensionDirectory}`,
		],
	});

	// 직접 띄운 컨텍스트라 설정 파일의 use가 닿지 않는다. login()의 waitForURL은 기본값이면 끝없이 기다려,
	// 로그인이 막혔을 때 어디서 멈췄는지 드러나지 않으므로 상한을 건다.
	context.setDefaultTimeout(30 * 1000);

	return context;
};

/**
 * 확장이 설치 직후 여는 웹 메모 탭을 닫는다.
 * @description 설치 탭은 비동기로 늦게 열리고 `ext_cid` 쿼리가 붙는다. 캡처 중에 열리면 활성 탭을 가져가
 * 사이드 패널이 엉뚱한 페이지를 따라가므로, 열릴 때까지 최대 20초 기다렸다가 닫는다.
 */
export const closeInstallTab = async (context: BrowserContext) => {
	await expect
		.poll(
			() => context.pages().some((page) => page.url().includes("ext_cid=")),
			{ timeout: 20000 },
		)
		.toBe(true)
		.catch(() => {
			// 설치 탭을 열지 않는 환경이면 닫을 것이 없다.
		});

	for (const page of context.pages()) {
		if (page.url().includes("ext_cid=")) {
			await page.close();
		}
	}
};
