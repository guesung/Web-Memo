import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 사이드 패널의 요약·메모 경계(ResizeHandle)를 마우스로 끌어 요약 영역 비율을 바꾼다.
 * @description 확장 코드는 건드리지 않고 사용자가 하는 조작 그대로 핸들을 끈다. 이동량은 패널 높이 대비 비율로
 * 계산하고, 끝난 뒤 핸들의 aria-valuenow가 목표 비율(±1)에 닿았는지 확인한다.
 * @throws 핸들을 찾지 못하거나 비율이 목표에 닿지 않으면 던진다.
 */
export const dragSidePanelDivider = async ({
	sidePanelPage,
	tabRatio,
}: IFDragSidePanelDividerParams) => {
	// 느낀 점 칸이 켜지면 메모·느낀 점 사이에도 같은 이름의 핸들이 생긴다. 요약·메모 경계는 DOM에서 첫 번째다.
	const divider = sidePanelPage
		.getByRole("slider", { name: "Resize panels" })
		.first();
	const dividerBox = await divider.boundingBox();

	if (!dividerBox) {
		throw new Error("사이드 패널의 요약·메모 경계를 찾지 못했습니다.");
	}

	const currentRatio = Number(await divider.getAttribute("aria-valuenow"));
	const panelHeight = await sidePanelPage.evaluate(
		() => document.querySelector("main")?.getBoundingClientRect().height ?? 0,
	);
	await dragVertically({
		sidePanelPage,
		box: dividerBox,
		deltaY: ((tabRatio - currentRatio) / 100) * panelHeight,
	});
	await expect
		.poll(async () =>
			Math.abs(Number(await divider.getAttribute("aria-valuenow")) - tabRatio),
		)
		.toBeLessThanOrEqual(1);
};

/**
 * 메모 칸과 느낀 점 칸 사이 경계를 끌어 메모 칸을 내용 높이에 맞추고, 남는 높이를 느낀 점 칸에 준다.
 * @description 느낀 점 칸이 꺼져 있으면 경계가 없으므로 아무것도 하지 않는다. 메모 칸에는 한 줄(16px) 여유를 둔다.
 * 남은 높이가 모자라면 느낀 점 칸을 44px까지만 줄이고, 메모 칸은 그만큼만 커진다.
 * @throws 경계가 보이는데 위치를 읽지 못하면 던진다.
 */
export const fitMemoFieldToContent = async (sidePanelPage: Page) => {
	const fieldDivider = sidePanelPage
		.getByRole("slider", { name: "Resize panels" })
		.nth(1);

	if ((await fieldDivider.count()) === 0) {
		return;
	}

	const fieldDividerBox = await fieldDivider.boundingBox();

	if (!fieldDividerBox) {
		throw new Error("메모·느낀 점 경계의 위치를 읽지 못했습니다.");
	}

	// 내용이 칸보다 짧으면 scrollHeight가 칸 높이와 같게 나오고, 칸 자체의 높이를 줄여도 레이아웃이 되돌린다.
	// 같은 클래스·폭의 숨은 복제본을 body에 붙여 높이 0에서 내용 높이를 잰다.
	const memoSize = await sidePanelPage
		.locator("#memo-textarea")
		.evaluate((textarea) => {
			if (!(textarea instanceof HTMLTextAreaElement)) {
				throw new Error("#memo-textarea가 textarea가 아닙니다.");
			}

			const measuringTextarea = document.createElement("textarea");
			measuringTextarea.className = textarea.className;
			measuringTextarea.value = textarea.value;
			measuringTextarea.style.cssText = `position: absolute; visibility: hidden; height: 0; width: ${textarea.offsetWidth}px;`;
			document.body.append(measuringTextarea);
			const contentHeight = measuringTextarea.scrollHeight;
			measuringTextarea.remove();

			return { clientHeight: textarea.clientHeight, contentHeight };
		});

	const impressionHeight = await sidePanelPage
		.locator("#impression-textarea")
		.evaluate((textarea) => textarea.clientHeight);

	// 느낀 점 칸을 한 줄 입력칸 높이(44px) 밑으로 줄이면 칸 제목과 자리표시 문구가 아래 버튼 줄과 겹친다.
	await dragVertically({
		sidePanelPage,
		box: fieldDividerBox,
		deltaY: Math.min(
			memoSize.contentHeight + 16 - memoSize.clientHeight,
			impressionHeight - 44,
		),
	});
};

/** 핸들 한가운데를 잡고 세로로 끈 뒤, 근처 버튼이 hover 색으로 찍히지 않도록 마우스를 치운다. */
const dragVertically = async ({
	sidePanelPage,
	box,
	deltaY,
}: IFDragVerticallyParams) => {
	const centerX = box.x + box.width / 2;
	const centerY = box.y + box.height / 2;

	await sidePanelPage.mouse.move(centerX, centerY);
	await sidePanelPage.mouse.down();
	await sidePanelPage.mouse.move(centerX, centerY + deltaY, { steps: 10 });
	await sidePanelPage.mouse.up();
	await sidePanelPage.mouse.move(0, 0);
};

/**
 * 사이드 패널에 보이는 메모 칸(메모, 켜져 있으면 느낀 점)이 내용을 잘림 없이 다 보여 주는지 확인한다.
 * @throws 어느 칸이든 스크롤이 생겨 내용이 잘리면 던진다.
 */
export const expectMemoFieldsFullyVisible = async (sidePanelPage: Page) => {
	const fieldSizes = await sidePanelPage
		.locator("#memo-textarea, #impression-textarea")
		.evaluateAll((textareas) =>
			textareas.map((textarea) => ({
				id: textarea.id,
				clientHeight: textarea.clientHeight,
				scrollHeight: textarea.scrollHeight,
			})),
		);

	for (const fieldSize of fieldSizes) {
		expect(
			fieldSize.scrollHeight,
			`${fieldSize.id}의 내용이 잘립니다`,
		).toBeLessThanOrEqual(fieldSize.clientHeight);
	}
};

/** {@link dragSidePanelDivider}의 인자. */
interface IFDragSidePanelDividerParams {
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 요약 영역이 차지할 목표 비율(%). 확장 기본값은 60이다 */
	tabRatio: number;
}

/** {@link dragVertically}의 인자. */
interface IFDragVerticallyParams {
	/** 확장의 사이드 패널 페이지 */
	sidePanelPage: Page;
	/** 끌 핸들의 위치 */
	box: { x: number; y: number; width: number; height: number };
	/** 끌 거리(px). 음수면 위로 */
	deltaY: number;
}
