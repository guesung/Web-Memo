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

it("저장된 메모가 없으면 empty이고, 저장이 성공하면 조용히 saved로 바뀐다", async () => {
	mocks.memo = undefined;
	await render();
	expect(form.saveStatus).toBe("empty");

	await act(async () => form.saveMemo({ memo: "내용" }));

	expect(form.saveStatus).toBe("saved");
});

it("저장이 1초를 넘기면 slow로 바뀐다", async () => {
	let resolveUpsert = () => {};
	mocks.upsert.mockImplementation((_request, callbacks) => {
		resolveUpsert = () => callbacks.onSuccess();
	});
	await render();

	act(() => {
		void form.saveMemo({ memo: "느린 저장" });
	});
	expect(form.saveStatus).toBe("saved");

	await act(async () => {
		await vi.advanceTimersByTimeAsync(1000);
	});
	expect(form.saveStatus).toBe("slow");

	await act(async () => resolveUpsert());
	expect(form.saveStatus).toBe("saved");
});

it("저장에 실패하면 다음 성공까지 failed를 유지한다", async () => {
	mocks.upsert.mockImplementation((_request, callbacks) => callbacks.onError());
	await render();

	await act(async () => form.saveMemo({ memo: "실패" }));
	expect(form.saveStatus).toBe("failed");

	mocks.upsert.mockImplementation((_request, callbacks) =>
		callbacks.onSuccess(),
	);
	await act(async () => form.saveMemo({ memo: "재시도" }));
	expect(form.saveStatus).toBe("saved");
});

it("다시 시도를 누르면 즉시 retrying으로 바뀌고 현재 폼 값으로 저장한다", async () => {
	mocks.upsert.mockImplementation((_request, callbacks) => callbacks.onError());
	await render();
	mocks.values.memo = "실패";
	await act(async () => form.saveMemo());
	expect(form.saveStatus).toBe("failed");

	let resolveRetry = () => {};
	mocks.upsert.mockImplementation((_request, callbacks) => {
		resolveRetry = () => callbacks.onSuccess();
	});
	act(() => {
		form.handleSaveRetryClick();
	});
	expect(form.saveStatus).toBe("retrying");

	// handleSaveRetryClick은 getTabInfo()를 기다린 뒤에야 upsertMemo를 부른다.
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(mocks.upsert.mock.calls.at(-1)?.[0].data.memo).toBe("실패");

	await act(async () => resolveRetry());
	expect(form.saveStatus).toBe("saved");
});

it("새 메모 첫 저장 중 낙관적 캐시가 삽입돼도 1초를 넘기면 slow로 바뀐다", async () => {
	mocks.memo = undefined;
	await render();
	expect(form.saveStatus).toBe("empty");

	let resolveUpsert = () => {};
	mocks.upsert.mockImplementation((_request, callbacks) => {
		resolveUpsert = () => callbacks.onSuccess();
	});
	mocks.values.memo = "새 메모 내용";
	act(() => {
		void form.saveMemo({ memo: "새 메모 내용" });
	});

	// onMutate가 음수 id로 낙관적 캐시를 넣은 순간을 흉내낸다. 저장 중에는 이 변화로
	// saveStatus가 "saved"로 앞당겨지면 안 된다(Q-07).
	mocks.memo = { id: -1, title: "A" };
	await render();
	expect(form.saveStatus).toBe("empty");
	expect(mocks.values.memo).toBe("새 메모 내용");

	await act(async () => {
		await vi.advanceTimersByTimeAsync(1000);
	});
	expect(form.saveStatus).toBe("slow");

	await act(async () => resolveUpsert());
	expect(form.saveStatus).toBe("saved");
});

it("새 메모 insert가 실패하면 failed를 유지하고 입력한 본문을 지우지 않는다", async () => {
	mocks.memo = undefined;
	await render();

	let rejectUpsert = () => {};
	mocks.upsert.mockImplementation((_request, callbacks) => {
		rejectUpsert = () => callbacks.onError();
	});
	mocks.values.memo = "잃으면 안 되는 내용";
	act(() => {
		void form.saveMemo({ memo: "잃으면 안 되는 내용" });
	});

	// onMutate의 낙관적 삽입 → 실패 후 onError의 롤백을 흉내낸다.
	mocks.memo = { id: -1, title: "A" };
	await render();
	// saveMemo는 getTabInfo()를 기다린 뒤에야 upsertMemo를 부르므로 대기 중인 마이크로태스크를 흘려보낸다.
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
	await act(async () => rejectUpsert());
	expect(form.saveStatus).toBe("failed");

	mocks.memo = undefined;
	await render();

	expect(form.saveStatus).toBe("failed");
	expect(mocks.values.memo).toBe("잃으면 안 되는 내용");
});

it("다시 시도 저장이 1초를 넘어도 slow가 아니라 retrying을 유지한다", async () => {
	mocks.upsert.mockImplementation((_request, callbacks) => callbacks.onError());
	await render();
	mocks.values.memo = "실패";
	await act(async () => form.saveMemo());
	expect(form.saveStatus).toBe("failed");

	let resolveRetry = () => {};
	mocks.upsert.mockImplementation((_request, callbacks) => {
		resolveRetry = () => callbacks.onSuccess();
	});
	act(() => {
		form.handleSaveRetryClick();
	});
	expect(form.saveStatus).toBe("retrying");

	await act(async () => {
		await vi.advanceTimersByTimeAsync(1000);
	});
	expect(form.saveStatus).toBe("retrying");

	await act(async () => resolveRetry());
	expect(form.saveStatus).toBe("saved");
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
	await act(async () => form.handleMemoChange("저장할 내용"));
	let isSaved = true;
	await act(async () => {
		isSaved = await form.saveBeforeSwitch();
	});

	expect(isSaved).toBe(false);
});

it("바뀐 내용이 없으면 저장하지 않고 바로 전환한다", async () => {
	await render();
	let isSaved = false;
	await act(async () => {
		isSaved = await form.saveBeforeSwitch();
	});

	expect(isSaved).toBe(true);
	expect(mocks.upsert).not.toHaveBeenCalled();
});

it("입력이 이미 저장됐으면 전환할 때 다시 저장하지 않는다", async () => {
	await render();
	await act(async () => form.handleMemoChange("저장된 내용"));
	await act(async () => {
		await vi.advanceTimersByTimeAsync(1500);
	});
	const saveCount = mocks.upsert.mock.calls.length;
	expect(saveCount).toBeGreaterThan(0);
	let isSaved = false;
	await act(async () => {
		isSaved = await form.saveBeforeSwitch();
	});

	expect(isSaved).toBe(true);
	expect(mocks.upsert).toHaveBeenCalledTimes(saveCount);
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
