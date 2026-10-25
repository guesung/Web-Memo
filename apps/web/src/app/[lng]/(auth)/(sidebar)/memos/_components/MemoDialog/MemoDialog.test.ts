// @vitest-environment jsdom

import type { GetMemoResponse } from "@web-memo/shared/types";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoDialog from "./index";

const MOCKS = vi.hoisted(() => ({
	queryMemo: undefined as Record<string, unknown> | undefined,
	querySucceeded: false,
	initialMemo: {
		id: 1,
		url: "https://example.com/first",
		title: "제목",
		memo: "본문",
		impression: "느낀점",
		actionItem: "할 일",
	},
	highlights: vi.fn(),
	refetch: vi.fn(),
	adjustHeight: vi.fn(),
	mutate: vi.fn(),
	resolveSave: undefined as (() => void) | undefined,
	debounce: vi.fn(),
	pendingSave: undefined as (() => void) | undefined,
	setSearchParam: vi.fn(),
}));
vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({
		t: (key: string, options?: { count: number }) =>
			key === "highlight.memo.relatedCount"
				? `하이라이트 ${options?.count}개`
				: key,
	}),
}));
vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({
		data: MOCKS.queryMemo ? { data: [MOCKS.queryMemo] } : undefined,
		isSuccess: MOCKS.querySucceeded,
		refetch: MOCKS.refetch,
	}),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useHighlightMemoLinks: () => ({
		data: [],
		isError: false,
		refetch: MOCKS.refetch,
	}),
	memoQueryOptions: () => ({}),
	useSupabaseClientQuery: () => ({ data: {} }),
	useSettingQuery: () => ({ showImpression: true, showActionItem: true }),
	useMemoPatchMutation: () => ({
		mutateAsync: (variables: object) => {
			MOCKS.mutate(variables);
			return new Promise<void>((resolve) => {
				MOCKS.resolveSave = resolve;
			});
		},
	}),
	useDebounce: () => ({
		debounce: (callback: () => void) => {
			MOCKS.pendingSave = callback;
		},
		flushDebounce: () => MOCKS.pendingSave?.(),
		abortDebounce: vi.fn(),
	}),
	useKeyboardBind: vi.fn(),
}));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => ({
		set: MOCKS.setSearchParam,
		removeAll: vi.fn(),
		getUrl: () => "/memos?id=2",
	}),
}));
vi.mock("@web-memo/shared/utils", () => ({
	adjustTextareaHeight: MOCKS.adjustHeight,
	cn: (...classNames: unknown[]) => classNames.filter(Boolean).join(" "),
}));
vi.mock("../MemoView/_hooks/useMemoHighlights", () => ({
	useMemoHighlights: MOCKS.highlights,
}));
vi.mock("../MemoCardHeader", () => ({
	default: ({ memo }: { memo: { title: string } }) =>
		createElement("h2", null, memo.title),
}));
vi.mock("../MemoCardFooter", () => ({
	default: ({
		className,
		timeAccessory,
	}: {
		className: string;
		timeAccessory: ReactNode;
	}) =>
		createElement(
			"footer",
			{ className, "data-testid": "memo-detail-footer" },
			timeAccessory,
		),
}));
vi.mock("../MemoCardFooter/useMemoCategoryPopover", () => ({
	default: () => ({ openFromHash: vi.fn() }),
}));
vi.mock("../MemoCardFooter/CategoryPopover", () => ({
	default: () => null,
}));
vi.mock("./SaveStatusIndicator", () => ({
	default: ({ status }: { status: string }) =>
		createElement("span", { "data-testid": "save-status" }, status),
}));
vi.mock("@web-memo/ui", () => ({
	Button: (props: object) =>
		createElement("button", { type: "button", ...props }),
	IconTooltip: ({ children }: { children: ReactNode }) => children,
	Dialog: ({ children }: { children: ReactNode }) => children,
	DialogContent: ({ children }: { children: ReactNode }) => children,
	DialogTitle: ({ children }: { children: ReactNode }) => children,
	Loading: () => createElement("span", null, "loading"),
	Textarea: ({ layout: _layout, ...props }: { layout: boolean }) =>
		createElement("textarea", props),
}));

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;
async function render(
	memoId = 1,
	options: {
		memo?: Partial<GetMemoResponse>;
		prevMemoId?: number;
		nextMemoId?: number;
	} = {},
) {
	await act(async () =>
		root.render(
			createElement(MemoDialog, {
				lng: "ko",
				memoId,
				initialMemo: {
					...MOCKS.initialMemo,
					...options.memo,
					id: memoId,
				} as GetMemoResponse,
				prevMemoId: options.prevMemoId,
				nextMemoId: options.nextMemoId,
			}),
		),
	);
}
function pressKey(key: string, target: EventTarget = document.body) {
	return act(async () => {
		target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
	});
}
function textarea(testId: string) {
	return container.querySelector<HTMLTextAreaElement>(
		`[data-testid="${testId}"]`,
	);
}
async function edit(testId: string, value: string) {
	const element = textarea(testId);
	if (!element) throw new Error(`Missing ${testId}`);
	await act(async () => {
		Object.getOwnPropertyDescriptor(
			HTMLTextAreaElement.prototype,
			"value",
		)?.set?.call(element, value);
		element.dispatchEvent(new Event("input", { bubbles: true }));
	});
}
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	MOCKS.queryMemo = undefined;
	MOCKS.querySucceeded = false;
	MOCKS.pendingSave = undefined;
	MOCKS.resolveSave = undefined;
	MOCKS.highlights.mockReturnValue({
		highlightsByUrl: new Map(),
		isHighlightLoadError: false,
		refetchHighlights: MOCKS.refetch,
	});
	root = createRoot(container);
});
afterEach(async () => {
	await act(async () => root.unmount());
	container.innerHTML = "";
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("메모 상세 즉시 표시와 동기화", () => {
	it("카드 값을 첫 렌더에 보여주고 초기값만으로 저장하지 않는다", async () => {
		await render();
		expect(container.querySelector("h2")?.textContent).toBe("제목");
		expect(textarea("memo-textarea")?.value).toBe("본문");
		expect(textarea("impression-textarea")?.value).toBe("느낀점");
		expect(MOCKS.pendingSave).toBeUndefined();
		expect(MOCKS.mutate).not.toHaveBeenCalled();
	});
	it("카드 없는 직접 진입에서 결과가 없으면 닫을 수 있는 실패 상태를 보여준다", async () => {
		MOCKS.querySucceeded = true;
		await act(async () =>
			root.render(createElement(MemoDialog, { lng: "ko", memoId: 9 })),
		);
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"error.404.title",
		);
	});
	it("지연된 상세 응답은 미편집 필드만 최신화한다", async () => {
		await render();
		const initialMeasurements = MOCKS.adjustHeight.mock.calls.length;
		await edit("memo-textarea", "수정한 본문");
		expect(MOCKS.adjustHeight.mock.calls.length).toBeGreaterThan(
			initialMeasurements,
		);
		MOCKS.queryMemo = {
			...MOCKS.initialMemo,
			memo: "서버 본문",
			impression: "서버 느낀점",
		};
		await render();
		expect(MOCKS.adjustHeight).toHaveBeenCalledWith(
			textarea("impression-textarea"),
		);
		expect(textarea("memo-textarea")?.value).toBe("수정한 본문");
		expect(textarea("impression-textarea")?.value).toBe("서버 느낀점");
		await act(async () => MOCKS.pendingSave?.());
		expect(MOCKS.mutate.mock.calls[0]?.[0]).toEqual({
			id: 1,
			request: { memo: "수정한 본문" },
		});
	});
	it("사용자 입력을 원래 값으로 되돌리면 PATCH하지 않는다", async () => {
		await render();
		await edit("memo-textarea", "임시 수정");
		await edit("memo-textarea", "본문");
		await act(async () => MOCKS.pendingSave?.());
		expect(MOCKS.mutate).not.toHaveBeenCalled();
		expect(
			container.querySelector('[data-testid="save-status"]')?.textContent,
		).toBe("idle");
	});
	it("저장 중 추가 입력은 오래된 성공 콜백이 지우지 않는다", async () => {
		await render();
		await edit("memo-textarea", "첫 수정");
		await act(async () => MOCKS.pendingSave?.());
		await edit("memo-textarea", "두 번째 수정");
		await act(async () => MOCKS.resolveSave?.());
		expect(
			container.querySelector('[data-testid="save-status"]')?.textContent,
		).toBe("saving");
		expect(MOCKS.mutate.mock.calls[1]?.[0].request).toEqual({
			memo: "두 번째 수정",
		});
	});
	it("저장 중 닫혀도 추가 입력은 첫 저장 완료 후 전송한다", async () => {
		await render();
		await edit("memo-textarea", "첫 수정");
		await act(async () => MOCKS.pendingSave?.());
		await edit("memo-textarea", "닫기 전 수정");
		await act(async () => root.unmount());
		await act(async () => MOCKS.resolveSave?.());
		expect(MOCKS.mutate.mock.calls[1]?.[0].request).toEqual({
			memo: "닫기 전 수정",
		});
		root = createRoot(container);
	});
});

describe("메모 상세 하이라이트", () => {
	it("결과가 없으면 영역이 없고, 결과는 기본 접힘에서 클릭으로 펼친다", async () => {
		await render();
		expect(container.querySelector("[aria-expanded]")).toBeNull();
		MOCKS.highlights.mockReturnValue({
			highlightsByUrl: new Map([
				[
					MOCKS.initialMemo.url,
					[{ id: 1, exact_text: "선택한 원문", color: "yellow" }],
				],
			]),
			isHighlightLoadError: false,
			refetchHighlights: MOCKS.refetch,
		});
		await render();
		const button =
			container.querySelector<HTMLButtonElement>("[aria-expanded]");
		expect(button?.getAttribute("aria-expanded")).toBe("false");
		expect(button?.textContent).toBe("하이라이트 1개");
		expect(container.querySelector("mark")).toBeNull();
		await act(async () => button?.click());
		expect(container.querySelector("mark")?.textContent).toBe("선택한 원문");
		const html = container.innerHTML;
		expect(html.indexOf("action-item-textarea")).toBeLessThan(
			html.indexOf("<mark"),
		);
		expect(html.indexOf("<mark")).toBeLessThan(html.indexOf("save-status"));
	});
	it("조회 실패를 알리고 재시도하며 ID 전환 때 접힘으로 돌아간다", async () => {
		MOCKS.highlights.mockReturnValue({
			highlightsByUrl: new Map(),
			isHighlightLoadError: true,
			refetchHighlights: MOCKS.refetch,
		});
		await render();
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"highlight.loadError",
		);
		await act(async () => container.querySelector("button")?.click());
		expect(MOCKS.refetch).toHaveBeenCalledOnce();
		MOCKS.highlights.mockReturnValue({
			highlightsByUrl: new Map([
				[
					MOCKS.initialMemo.url,
					[{ id: 1, exact_text: "인용", color: "yellow" }],
				],
			]),
			isHighlightLoadError: false,
			refetchHighlights: MOCKS.refetch,
		});
		await render();
		await act(async () =>
			container.querySelector<HTMLButtonElement>("[aria-expanded]")?.click(),
		);
		await render(2);
		expect(
			container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded"),
		).toBe("false");
	});
});

describe("메모 상세 보조 필드 접기", () => {
	it("비어 있는 느낀 점·액션 아이템은 + 버튼만 보이고, 누르면 입력칸이 열려 포커스된다", async () => {
		// 포커스는 문서에 붙은 요소에만 간다.
		document.body.append(container);
		await render(1, { memo: { impression: "", actionItem: "" } });
		expect(textarea("impression-textarea")).toBeNull();
		expect(textarea("action-item-textarea")).toBeNull();
		const addImpression = container.querySelector<HTMLButtonElement>(
			'[data-testid="add-impression-button"]',
		);
		await act(async () => addImpression?.click());
		expect(document.activeElement).toBe(textarea("impression-textarea"));
		expect(
			container.querySelector('[data-testid="add-impression-button"]'),
		).toBeNull();
		expect(
			container.querySelector('[data-testid="add-action-item-button"]'),
		).not.toBeNull();
		container.remove();
	});
	it("내용이 있던 필드는 모두 지워도 닫히지 않는다", async () => {
		await render();
		await edit("impression-textarea", "");
		expect(textarea("impression-textarea")).not.toBeNull();
	});
});

describe("메모 상세 이전·다음 이동", () => {
	beforeEach(() => {
		vi.spyOn(history, "replaceState");
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("화살표 키로 앞뒤 메모로 바꾸며 기록을 쌓지 않는다", async () => {
		history.pushState({ openedMemoId: 1 }, "");
		await render(1, { prevMemoId: 3, nextMemoId: 2 });
		await pressKey("ArrowRight");
		expect(MOCKS.setSearchParam).toHaveBeenLastCalledWith("id", "2");
		expect(history.replaceState).toHaveBeenLastCalledWith(
			{ openedMemoId: 2 },
			"",
			"/memos?id=2",
		);
		await pressKey("ArrowLeft");
		expect(MOCKS.setSearchParam).toHaveBeenLastCalledWith("id", "3");
	});
	it("입력칸에서 누른 화살표 키는 커서 이동에만 쓴다", async () => {
		await render(1, { nextMemoId: 2 });
		const memoTextarea = textarea("memo-textarea");
		if (!memoTextarea) throw new Error("Missing memo-textarea");
		await pressKey("ArrowRight", memoTextarea);
		expect(MOCKS.setSearchParam).not.toHaveBeenCalled();
	});
	it("넘기기 전에 편집 중인 내용을 먼저 저장한다", async () => {
		await render(1, { nextMemoId: 2 });
		await edit("memo-textarea", "넘기기 전 수정");
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-testid="memo-dialog-next"]')
				?.click(),
		);
		expect(MOCKS.mutate.mock.calls[0]?.[0].request).toEqual({
			memo: "넘기기 전 수정",
		});
		expect(MOCKS.setSearchParam).toHaveBeenLastCalledWith("id", "2");
	});
	it("끝에 닿은 방향의 버튼은 꺼진다", async () => {
		await render(1, { prevMemoId: 3 });
		expect(
			container.querySelector<HTMLButtonElement>(
				'[data-testid="memo-dialog-next"]',
			)?.disabled,
		).toBe(true);
	});
});
