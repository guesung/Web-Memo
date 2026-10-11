import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { HIGHLIGHT_COLORS } from "@web-memo/shared/constants";
import { screenshotWhenStable } from "./sceneCapture";

/** content-ui가 하이라이트 버블·편집 툴바를 그리는 ShadowRoot의 호스트. */
const HIGHLIGHT_UI_HOST = "#WEB_MEMO_HIGHLIGHT_TOOLTIP";

/** 문장 첫 줄이 화면 위에서 이 높이쯤 오도록 스크롤한다(CSS px). 뷰포트 위쪽 1/3 안이어야 한다. */
const HIGHLIGHT_TOP_OFFSET = 130;

/**
 * 확장의 사이드 패널에서 하이라이트 버블이 뜨도록 설정을 켠다.
 * @description 첫 선택 안내 말풍선(HighlightIntroCoachmark)은 `highlightIntroSeen`으로 꺼서 찍히지 않게 한다.
 */
export const enableHighlightBubble = async (sidePanelPage: Page) => {
	await sidePanelPage.evaluate(async () => {
		await chrome.storage.sync.set({
			highlightBubbleEnabled: true,
			highlightIntroSeen: true,
			highlightDisabledSites: [],
		});
	});
};

/**
 * 저장된 하이라이트가 기사 위에 칠해질 때까지 기다린다.
 * @description 복원은 확장 백그라운드에 하이라이트를 조회한 뒤 본문에서 문장을 찾아 CSS Custom Highlight로 그린다.
 * 본문이 늦게 뜨는 실제 페이지(brunch)도 있으므로 색 등록이 보일 때까지 기다린다.
 */
export const waitForHighlightPainted = async (page: Page) => {
	await expect
		.poll(
			() =>
				page.evaluate(() =>
					// TypeScript DOM lib의 HighlightRegistry에는 아직 Map 메서드가 없다.
					(CSS.highlights as unknown as { has(name: string): boolean }).has(
						"webmemo-yellow",
					),
				),
			{ timeout: 30000 },
		)
		.toBe(true);
};

/** 스크롤한 뒤 기사 오른쪽에 스크롤바가 떠 있는 채로 찍히지 않도록 숨긴다. */
export const hideScrollbar = async (page: Page) => {
	await page.addStyleTag({ content: "html { scrollbar-width: none; }" });
};

/**
 * 1번 장: 칠한 문장을 눌러 편집 툴바를 열고 메모 칸을 펼쳐 메모가 채워진 모습을 찍는다.
 * @description 툴바는 누른 자리의 아래에 붙는다. 문장의 마지막 줄 오른쪽 끝을 눌러 문장 오른쪽 아래에 오게 한다.
 */
export const captureHighlightNoteScene = async ({
	page,
	labels,
	text,
	note,
	outputPath,
}: IFCaptureHighlightNoteSceneParams) => {
	await scrollTextIntoUpperThird({ page, text });
	const { lastLine } = await locateText({ page, text });

	await page.mouse.click(
		lastLine.right - 6,
		lastLine.top + lastLine.height / 2,
	);

	const editToolbar = page
		.locator(HIGHLIGHT_UI_HOST)
		.getByRole("toolbar", { name: labels.edit });

	await expect(editToolbar).toBeVisible();
	await editToolbar
		.getByRole("button", { name: labels.note, exact: true })
		.click();
	const noteField = editToolbar.getByRole("textbox");

	await expect(noteField).toHaveValue(note);
	// 메모 칸 높이는 고정이라 긴 메모는 아래가 잘린다. 잘리면 메모 문구를 줄이도록 여기서 멈춘다.
	await expect
		.poll(() =>
			noteField.evaluate(
				(textarea) => textarea.scrollHeight <= textarea.clientHeight,
			),
		)
		.toBe(true);
	// 저장 중·실패·로그인 요구 문구는 모두 <output>으로 그려진다. 하나도 없어야 한다.
	await expect(editToolbar.locator("output")).toHaveCount(0);
	await blurActiveElement(page);
	await page.mouse.move(0, 0);
	await screenshotWhenStable({ page, path: outputPath });
	await page.keyboard.press("Escape");
	await expect(editToolbar).toBeHidden();
};

/**
 * 2번 장: 칠하지 않은 다른 문장을 선택해 5색 버블이 뜬 모습을 찍는다.
 * @description 버블의 색·메모 버튼이 비활성(opacity-50)이면 찍히지 않도록 모두 켜질 때까지 기다린다.
 */
export const captureHighlightSelectionScene = async ({
	page,
	labels,
	text,
	outputPath,
}: IFCaptureHighlightSelectionSceneParams) => {
	await scrollTextIntoUpperThird({ page, text });
	await selectText({ page, text });

	const bubble = page
		.locator(HIGHLIGHT_UI_HOST)
		.getByRole("toolbar", { name: labels.create });

	await expect(bubble).toBeVisible();
	for (const color of HIGHLIGHT_COLORS) {
		await expect(
			bubble.getByRole("button", { name: labels.colors[color] }),
		).toBeEnabled();
	}
	await expect(
		bubble.getByRole("button", { name: labels.note, exact: true }),
	).toBeEnabled();
	// 안내 말풍선(role=note)과 저장 중·실패·로그인 요구 문구(<output>)가 없어야 한다.
	await expect(bubble.getByRole("note")).toHaveCount(0);
	await expect(bubble.locator("output")).toHaveCount(0);
	await page.mouse.move(0, 0);
	await screenshotWhenStable({ page, path: outputPath });
	await page.evaluate(() => document.getSelection()?.removeAllRanges());
	await expect(bubble).toBeHidden();
};

/** 문장이 본문에서 한 번만 나오는지 확인하고, 그 문장의 첫 줄과 마지막 줄 위치를 돌려준다. */
export const locateText = async ({
	page,
	text,
}: IFLocateTextParams): Promise<ITextLocation> =>
	page.evaluate((needle) => {
		// 확장의 앵커 복원(documentText.ts)과 같은 방식으로 텍스트 노드를 이어 붙여 위치를 센다.
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: (node) =>
					["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(
						node.parentElement?.tagName ?? "",
					)
						? NodeFilter.FILTER_REJECT
						: NodeFilter.FILTER_ACCEPT,
			},
		);
		const nodes: { node: Text; start: number }[] = [];
		let fullText = "";

		for (
			let current = walker.nextNode();
			current;
			current = walker.nextNode()
		) {
			nodes.push({ node: current as Text, start: fullText.length });
			fullText += (current as Text).data;
		}

		const start = fullText.indexOf(needle);

		if (start === -1) {
			throw new Error(`본문에서 문장을 찾지 못했습니다: ${needle}`);
		}
		if (fullText.indexOf(needle, start + 1) !== -1) {
			throw new Error(`본문에 같은 문장이 둘 이상입니다: ${needle}`);
		}

		const toPoint = (offset: number, preferEnd: boolean) => {
			const entry = [...nodes]
				.reverse()
				.find((candidate) =>
					preferEnd ? offset > candidate.start : offset >= candidate.start,
				);

			if (!entry) {
				throw new Error("문장 위치를 텍스트 노드로 바꾸지 못했습니다.");
			}

			return { node: entry.node, offset: offset - entry.start };
		};
		const startPoint = toPoint(start, false);
		const endPoint = toPoint(start + needle.length, true);
		const range = document.createRange();

		range.setStart(startPoint.node, startPoint.offset);
		range.setEnd(endPoint.node, endPoint.offset);

		const rects = Array.from(range.getClientRects()).filter(
			(rect) => rect.width > 0 && rect.height > 0,
		);
		const toLine = (rect: DOMRect) => ({
			left: rect.left,
			right: rect.right,
			top: rect.top,
			height: rect.height,
		});

		return {
			firstLine: toLine(rects[0]),
			lastLine: toLine(rects[rects.length - 1]),
		};
	}, text);

/** 문장 전체를 사용자가 드래그한 것처럼 선택한다. */
const selectText = async ({ page, text }: IFLocateTextParams) => {
	await page.evaluate((needle) => {
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
		);

		for (
			let current = walker.nextNode();
			current;
			current = walker.nextNode()
		) {
			const start = (current as Text).data.indexOf(needle);

			if (start === -1) {
				continue;
			}

			const range = document.createRange();

			range.setStart(current, start);
			range.setEnd(current, start + needle.length);
			const selection = document.getSelection();

			selection?.removeAllRanges();
			selection?.addRange(range);
			document.dispatchEvent(new Event("selectionchange"));
			return;
		}

		throw new Error(`한 텍스트 노드 안에서 문장을 찾지 못했습니다: ${needle}`);
	}, text);
};

/** 문장의 첫 줄이 화면 위쪽 1/3 안에 오도록 스크롤한다. 툴바가 문장을 가리지 않고 그 아래에 놓인다. */
const scrollTextIntoUpperThird = async ({ page, text }: IFLocateTextParams) => {
	const { firstLine } = await locateText({ page, text });

	await page.evaluate(
		(distance) => window.scrollBy(0, distance),
		firstLine.top - HIGHLIGHT_TOP_OFFSET,
	);
	const viewportHeight = page.viewportSize()?.height ?? 0;

	await expect
		.poll(async () => (await locateText({ page, text })).firstLine.top)
		.toBeLessThan(viewportHeight / 3);
};

/**
 * 버블·편집 툴바의 버튼 이름을 확장의 언어 사본에서 읽는다.
 * @description 사이드 패널 페이지에서만 `chrome.i18n`을 쓸 수 있다.
 */
export const readHighlightLabels = async (
	sidePanelPage: Page,
): Promise<IFHighlightLabels> =>
	sidePanelPage.evaluate(
		(colors) => {
			const message = (key: string) => chrome.i18n.getMessage(key);

			return {
				create: message("highlight_create"),
				edit: message("highlight_edit"),
				note: message("highlight_note"),
				colors: Object.fromEntries(
					colors.map((color) => [color, message(`highlight_color_${color}`)]),
				),
			};
		},
		[...HIGHLIGHT_COLORS],
	);

/** 메모 칸 캐럿이 찍히지 않도록 포커스를 뺀다. */
const blurActiveElement = async (page: Page) => {
	await page.evaluate(() => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	});
};

/** 하이라이트 UI 버튼의 현지화된 이름. */
export interface IFHighlightLabels {
	/** 색상·메모 버블(`role=toolbar`)의 이름 */
	create: string;
	/** 편집 툴바(`role=toolbar`)의 이름 */
	edit: string;
	/** 메모 버튼·메모 입력칸의 이름 */
	note: string;
	/** 색상 버튼 이름 */
	colors: Record<string, string>;
}

/** 첫 줄·마지막 줄의 뷰포트 기준 위치. */
interface ITextLocation {
	firstLine: ITextLine;
	lastLine: ITextLine;
}

/** 문장이 차지하는 한 줄의 뷰포트 기준 위치(CSS px). */
interface ITextLine {
	left: number;
	right: number;
	top: number;
	height: number;
}

/** {@link locateText}·{@link selectText}의 인자. */
interface IFLocateTextParams {
	/** 기사 탭 */
	page: Page;
	/** 본문 속 문장 */
	text: string;
}

/** {@link captureHighlightNoteScene}의 인자. */
interface IFCaptureHighlightNoteSceneParams {
	/** 기사 탭 */
	page: Page;
	/** 하이라이트 UI 버튼 이름 */
	labels: IFHighlightLabels;
	/** 칠해져 있는 문장 */
	text: string;
	/** 문장에 달린 메모. 메모 칸에 채워져 있어야 한다 */
	note: string;
	/** 저장할 PNG 경로 */
	outputPath: string;
}

/** {@link captureHighlightSelectionScene}의 인자. */
interface IFCaptureHighlightSelectionSceneParams {
	/** 기사 탭 */
	page: Page;
	/** 하이라이트 UI 버튼 이름 */
	labels: IFHighlightLabels;
	/** 선택할 문장. 칠한 문장과 겹치지 않아야 한다 */
	text: string;
	/** 저장할 PNG 경로 */
	outputPath: string;
}
