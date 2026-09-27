import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { DEMO_CONTENT, type TStoreLanguage } from "./demoData";
import { DASHBOARD_CLOCK_OFFSET_MS } from "./demoRoutes";

/**
 * 사이드 패널이 현재 탭의 제목과 메모를 다 그릴 때까지 기다린다.
 * @description 탭을 옮긴 직후에는 이전 페이지의 제목·메모가 남아 있으므로 둘 다 새 값으로 바뀐 것을 확인한다.
 */
export const waitForSidePanelMemo = async ({
	sidePanelPage,
	pageTitle,
	memo,
}: IFWaitForSidePanelMemoParams) => {
	await expect(sidePanelPage.locator("header")).toContainText(pageTitle);
	// favicon은 페이지보다 늦게 도착하고, 도착하면 사이드 패널이 탭 정보를 다시 읽어 머리글 아이콘을 바꾼다.
	// favicon이 없는 페이지도 있으므로 5초만 기다리고 넘어간다(그때는 지구본 아이콘이 보인다).
	await sidePanelPage
		.locator("header img")
		.waitFor({ timeout: 5000 })
		.catch(() => {});
	await expect(sidePanelPage.locator("#memo-textarea")).toHaveValue(memo);
	await expect(
		sidePanelPage.locator('[data-save-status="saving"]'),
	).toHaveCount(0);
};

/**
 * 메모에 붙는 출처("메모 ↗" 줄과 글 제목 줄)의 세로 위치를 JSON으로 저장한다.
 * @description 3번 장은 이 부분을 확대한다. 위치는 경계 비율과 폰트에 따라 달라지므로 찍은 화면에서 직접 잰다.
 * 값은 사이드 패널 CSS px 기준이다. 머리글 줄 바로 위에 붙은 경계 손잡이 아이콘이 줄 안으로 2px 넘쳐 들어오므로
 * 위쪽은 2px 안으로 자르고, 아래쪽은 메모 칸 테두리가 들어오지 않게 2px만 둔다.
 */
export const saveMemoSourceBox = async ({
	sidePanelPage,
	outputPath,
}: IFSaveMemoSourceBoxParams) => {
	const memoLabel = await sidePanelPage.evaluate(() =>
		chrome.i18n.getMessage("memo"),
	);
	const memoHeaderBox = await sidePanelPage
		.getByText(memoLabel, { exact: true })
		.locator("..")
		.boundingBox();
	const titleInputBox = await sidePanelPage
		.locator("#memo-title-input")
		.boundingBox();

	if (!memoHeaderBox || !titleInputBox) {
		throw new Error("메모 출처(메모 머리글·제목 줄)를 찾지 못했습니다.");
	}

	const top = Math.ceil(memoHeaderBox.y + 2);
	const bottom = Math.floor(titleInputBox.y + titleInputBox.height + 2);

	await writeFile(outputPath, JSON.stringify({ top, height: bottom - top }));
};

/** 사이드 패널과 옆에 둔 페이지를 각각 찍는다. 입력칸 포커스 링이 찍히지 않도록 포커스를 뺀다. */
export const captureSidePanelScene = async ({
	page,
	sidePanelPage,
	outputDirectory,
	name,
}: IFCaptureSceneParams) => {
	await sidePanelPage.evaluate(() => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	});
	await screenshotWhenStable({
		page: sidePanelPage,
		path: path.join(outputDirectory, `${name}-side-panel.png`),
	});
	await screenshotWhenStable({
		page,
		path: path.join(outputDirectory, `${name}-page.png`),
	});
};

/**
 * 웹 대시보드(/memos)를 목 데이터로 찍는다.
 * @description 사이드바 카테고리는 서버 컴포넌트가 실제 계정에서 미리 읽어 5분 캐시로 심는다(목이 닿지 않는다).
 * 브라우저의 Date만 10분 앞당겨 심긴 캐시를 처음부터 만료된 것으로 보이게 하면, 화면이 붙자마자 목 저장소에서
 * 다시 읽는다. Playwright의 가짜 시계는 타이머까지 멈춰 메모 카드가 그려지지 않으므로 쓰지 않는다.
 * 개발 서버에서만 뜨는 Next.js 표시와 React Grab, 떠 있는 상담 버튼과 알림 토스트(상담 연결 실패 등)는 화면에서 숨긴다.
 */
export const captureDashboard = async ({
	page,
	language,
	outputPath,
	categoryName,
}: IFCaptureDashboardParams) => {
	const content = DEMO_CONTENT[language];
	const category = content.categories.find(
		(item) => item.name === categoryName,
	);
	// 전체 목록은 위시리스트 메모를 빼고 보여준다.
	const listedMemoCount = [
		content.articleMemo,
		content.videoMemo,
		...content.otherMemos,
	].filter(
		(demoMemo) =>
			!demoMemo.isWish && (!category || demoMemo.categoryId === category.id),
	).length;

	await page.addInitScript((offsetMilliseconds) => {
		const RealDate = Date;

		class ShiftedDate extends RealDate {
			constructor(...args: ConstructorParameters<DateConstructor> | []) {
				if (args.length === 0) {
					super(RealDate.now() + offsetMilliseconds);
					return;
				}

				super(...(args as ConstructorParameters<DateConstructor>));
			}

			static now() {
				return RealDate.now() + offsetMilliseconds;
			}
		}

		globalThis.Date = ShiftedDate as DateConstructor;
	}, DASHBOARD_CLOCK_OFFSET_MS);
	// 데스크톱 레이아웃이 나오는 폭으로 찍고 템플릿이 줄여 넣는다.
	await page.setViewportSize({ width: category ? 1160 : 1280, height: 815 });
	await page.goto(`/${language}${PATHS.memos}`);
	if (category) {
		await page.getByRole("link", { name: category.name }).click();
	}
	await expect(page.locator(".memo-item")).toHaveCount(listedMemoCount);
	await expect(
		page
			.locator('a[href*="category="]')
			.filter({ hasText: content.categories.at(-1)?.name }),
	).toBeVisible();
	await page.addStyleTag({
		content: `nextjs-portal, #react-grab-root, [data-react-grab], [aria-label="채널톡 문의 열기"], [aria-label="Open support chat"], [role="region"]:has(> ol) { display: none !important; }`,
	});
	await page.mouse.move(0, 0);
	await screenshotWhenStable({
		page,
		path: outputPath,
		clip: category ? { x: 0, y: 0, width: 1160, height: 586 } : undefined,
	});
};

/**
 * 연달아 찍은 두 장이 같아질 때까지 다시 찍고 마지막 장을 저장한다.
 * @description 창 크기를 바꾼 직후나 백그라운드 탭은 이전 크기의 화면이 타일처럼 반복돼 찍히기도 하고,
 * 폰트·이미지·전환 효과가 늦게 끝나기도 한다. 그려진 결과가 멈춘 것을 직접 확인한다.
 * 실제 페이지(brunch·유튜브)는 표지·썸네일 이미지가 CDN에서 늦게 도착하므로 최대 6초(300ms × 20번)까지 기다린다.
 * @throws 스무 번 안에 화면이 멈추지 않으면 던진다.
 */
const screenshotWhenStable = async ({
	page,
	path: outputPath,
	clip,
}: IFScreenshotWhenStableParams) => {
	let previousScreenshot = await page.screenshot({
		animations: "disabled",
		clip,
	});

	for (let attempt = 0; attempt < 20; attempt += 1) {
		await page.waitForTimeout(300);
		const currentScreenshot = await page.screenshot({
			animations: "disabled",
			clip,
		});

		if (currentScreenshot.equals(previousScreenshot)) {
			await writeFile(outputPath, currentScreenshot);
			return;
		}

		previousScreenshot = currentScreenshot;
	}

	throw new Error(`화면이 멈추지 않아 캡처하지 못했습니다: ${outputPath}`);
};

/** {@link waitForSidePanelMemo}의 인자. */
interface IFWaitForSidePanelMemoParams {
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 사이드 패널 머리글에 보여야 할 현재 탭 제목 */
	pageTitle: string;
	/** 메모 칸에 채워져 있어야 할 메모 본문 */
	memo: string;
}

/** {@link saveMemoSourceBox}의 인자. */
interface IFSaveMemoSourceBoxParams {
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 위치를 저장할 JSON 경로 */
	outputPath: string;
}

/** {@link captureSidePanelScene}의 인자. */
interface IFCaptureSceneParams {
	/** 사이드 패널 옆에 놓일 웹 페이지 탭 */
	page: Page;
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 원본 PNG를 쓸 폴더 */
	outputDirectory: string;
	/** 파일 이름 앞부분. `<name>-page.png`, `<name>-side-panel.png`로 저장한다 */
	name: string;
}

/** {@link captureDashboard}의 인자. */
interface IFCaptureDashboardParams {
	/** 로그인한 웹 탭 */
	page: Page;
	/** 대시보드 언어 */
	language: TStoreLanguage;
	/** 저장할 PNG 경로 */
	outputPath: string;
	/** 지정하면 해당 카테고리를 선택한 5번 장면을 1160×586으로 찍는다 */
	categoryName?: string;
}

/** {@link screenshotWhenStable}의 인자. */
interface IFScreenshotWhenStableParams {
	/** 찍을 페이지 */
	page: Page;
	/** 저장할 PNG 경로 */
	path: string;
	/** 캡처할 화면 영역(CSS px). 없으면 전체 화면을 찍는다 */
	clip?: { x: number; y: number; width: number; height: number };
}
