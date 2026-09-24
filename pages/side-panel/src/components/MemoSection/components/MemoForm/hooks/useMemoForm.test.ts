// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useDebounce from "../../../../../../../../packages/shared/src/hooks/common/useDebounce";
import useMemoForm from "./useMemoForm";

const mocks = vi.hoisted(() => ({
	tab: { id: 1, url: "https://example.com/a", title: "A" },
	memo: { id: 1, title: "A" } as { id: number; title: string } | undefined,
	values: {} as Record<string, unknown>,
	upsert: vi.fn(),
	patch: vi.fn(),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useDebounce: () => useDebounce(),
	useDidMount: vi.fn(),
	useTabQuery: () => ({ data: mocks.tab }),
	useMemoQuery: () => ({ memo: mocks.memo, refetch: vi.fn() }),
	useMemoUpsertMutation: () => ({ mutate: mocks.upsert }),
	useMemoPatchMutation: () => ({ mutate: mocks.patch }),
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({ bridge: {} }));
vi.mock("@web-memo/shared/utils/extension", () => ({
	Tab: { get: async () => mocks.tab },
	getTabInfo: async () => mocks.tab,
}));
vi.mock("react-hook-form", () => ({
	useFormContext: () => ({
		setValue: setFormValue,
		getValues: (key?: string) => (key ? mocks.values[key] : mocks.values),
	}),
}));
const setFormValue = (key: string, value: unknown) => {
	mocks.values[key] = value;
};
let root: Root;
let form: ReturnType<typeof useMemoForm>;
let refreshTitle: () => Promise<void>;
const TestHook = () => {
	form = useMemoForm();
	return null;
};
const render = async () => {
	await act(async () => root.render(createElement(TestHook)));
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal("chrome", {
		tabs: {
			onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
			onUpdated: {
				addListener: vi.fn((listener) => {
					refreshTitle = listener;
				}),
				removeListener: vi.fn(),
			},
		},
	});
	mocks.tab = { id: 1, url: "https://example.com/a", title: "A" };
	mocks.memo = { id: 1, title: "A" };
	mocks.values = {};
	mocks.patch.mockReset();
	mocks.upsert
		.mockReset()
		.mockImplementation((_request, callbacks) => callbacks.onSuccess());
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("다른 저장 메모는 해당 저장 제목을 표시하며 같은 메모의 수동 입력은 보존한다", async () => {
	await render();
	await act(async () => form.handleTitleChange("A 직접 수정"));
	mocks.tab = { id: 2, url: "https://example.com/b", title: "B 페이지" };
	mocks.memo = { id: 2, title: "B 저장 제목" };
	await render();
	expect(mocks.values.title).toBe("B 저장 제목");
	await act(async () => {
		await vi.advanceTimersByTimeAsync(350);
	});
	expect(mocks.upsert).not.toHaveBeenCalled();
	await act(async () => form.handleTitleChange("B 직접 수정"));
	mocks.memo = { id: 2, title: "B 서버 응답" };
	await render();
	expect(mocks.values.title).toBe("B 직접 수정");
});

it("입력 debounce 전에 Link를 누르면 이전 제목은 저장하지 않고 현재 페이지 제목을 저장한다", async () => {
	await render();
	await act(async () => form.handleTitleChange("오래된 입력"));
	await act(async () => form.handleTitleSyncClick());
	await act(async () => {
		await vi.advanceTimersByTimeAsync(600);
	});
	expect(mocks.values.title).toBe("A");
	expect(mocks.upsert).toHaveBeenCalledTimes(1);
	expect(mocks.upsert.mock.calls[0][0].data.title).toBe("A");
});

it("제목 미수정 상태에서 최초 저장 후 새 페이지로 이동해도 자동 연동한다", async () => {
	mocks.memo = undefined;
	await render();
	expect(mocks.values.title).toBe("A");
	mocks.memo = { id: 1, title: "A" };
	await render();
	mocks.tab = { id: 2, url: "https://example.com/b", title: "B" };
	mocks.memo = undefined;
	await render();
	await act(async () => refreshTitle());
	expect(mocks.values.title).toBe("B");
});

it("저장된 메모의 카테고리를 바꾸면 변경 경로와 함께 patch한다", async () => {
	await render();
	await act(async () => form.updateCategory(3, "button"));
	expect(mocks.values.categoryId).toBe(3);
	expect(mocks.patch).toHaveBeenCalledTimes(1);
	expect(mocks.patch.mock.calls[0][0]).toEqual({
		id: 1,
		request: { category_id: 3 },
		categorySource: "button",
	});
});

it("카테고리 patch가 실패하면 이전 카테고리로 되돌린다", async () => {
	await render();
	mocks.values.categoryId = 2;
	mocks.patch.mockImplementation((_request, callbacks) => callbacks.onError());
	await act(async () => form.updateCategory(3, "button"));
	expect(mocks.values.categoryId).toBe(2);
});

it("patch 실패 전에 다른 카테고리를 골랐다면 그 선택을 되돌리지 않는다", async () => {
	await render();
	mocks.values.categoryId = 2;
	let failFirstPatch = () => {};
	mocks.patch.mockImplementationOnce((_request, callbacks) => {
		failFirstPatch = callbacks.onError;
	});
	await act(async () => form.updateCategory(3, "button"));
	await act(async () => form.updateCategory(4, "hash"));
	await act(async () => failFirstPatch());
	expect(mocks.values.categoryId).toBe(4);
});

it("저장 전 메모는 폼 값만 바꾸고 patch하지 않는다", async () => {
	mocks.memo = undefined;
	await render();
	await act(async () => form.updateCategory(3, "button"));
	expect(mocks.values.categoryId).toBe(3);
	expect(mocks.patch).not.toHaveBeenCalled();
});

it("다른 메모를 고르기 전에 입력을 선택한 ID로 저장하고 지연 저장을 취소한다", async () => {
	await render();
	await act(async () => form.handleMemoChange("변경한 내용"));
	let isSaved = false;
	await act(async () => {
		isSaved = await form.saveBeforeSwitch();
	});

	expect(isSaved).toBe(true);
	expect(mocks.upsert).toHaveBeenCalledTimes(1);
	expect(mocks.upsert.mock.calls[0][0]).toMatchObject({
		id: 1,
		data: { memo: "변경한 내용" },
	});
	await act(async () => {
		await vi.advanceTimersByTimeAsync(600);
	});
	expect(mocks.upsert).toHaveBeenCalledTimes(1);
});

it("전환 전 저장이 실패하면 선택 화면으로 나가지 않는다", async () => {
	mocks.upsert.mockImplementation((_request, callbacks) => callbacks.onError());
	await render();
	let isSaved = true;
	await act(async () => {
		isSaved = await form.saveBeforeSwitch();
	});

	expect(isSaved).toBe(false);
});

it("첫 저장으로 ID가 생겨도 저장 중 입력한 초안을 유지한다", async () => {
	mocks.memo = undefined;
	let completeFirstSave = () => {};
	mocks.upsert.mockImplementationOnce((_request, callbacks) => {
		completeFirstSave = callbacks.onSuccess;
	});
	await render();
	await act(async () => form.handleMemoChange("첫 입력"));
	await act(async () => {
		await vi.advanceTimersByTimeAsync(350);
	});
	await act(async () => form.handleMemoChange("저장 중 추가 입력"));
	mocks.memo = { id: 1, title: "A" };
	await render();
	expect(mocks.values.memo).toBe("저장 중 추가 입력");
	await act(async () => {
		completeFirstSave();
		await vi.advanceTimersByTimeAsync(600);
	});
	expect(mocks.values.memo).toBe("저장 중 추가 입력");
	expect(mocks.upsert.mock.calls.at(-1)?.[0].data.memo).toBe(
		"저장 중 추가 입력",
	);
});
