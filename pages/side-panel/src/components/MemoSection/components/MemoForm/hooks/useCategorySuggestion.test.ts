// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCategorySuggestion } from "./useCategorySuggestion";

const mocks = vi.hoisted(() => ({
	request: vi.fn(),
	createCategory: vi.fn(),
	trackEvent: vi.fn(),
	getStorage: vi.fn(),
	onSelect: vi.fn(),
	onAutoApply: vi.fn(),
	values: { categoryId: null as number | null },
	tab: { url: "https://example.com/a", title: "Article" },
}));

vi.mock("./requestCategorySuggestion", () => ({
	requestCategorySuggestion: mocks.request,
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useCategoryQuery: () => ({ categories: [{ id: 7, name: "개발" }] }),
	useTabQuery: () => ({ data: mocks.tab }),
	useCategoryPostMutation: () => ({ mutateAsync: mocks.createCategory }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: mocks.getStorage },
	STORAGE_KEYS: { autoApplyCategory: "autoApplyCategory" },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getTabInfo: async () => mocks.tab,
	I18n: { get: (key: string) => key },
}));
vi.mock("@web-memo/shared/utils", () => ({
	generateRandomPastelColor: () => "#abcdef",
}));
vi.mock("@web-memo/ui", () => ({ toast: vi.fn() }));
vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
vi.mock("react-hook-form", () => ({
	useFormContext: () => ({
		getValues: (key: "categoryId") => mocks.values[key],
	}),
}));

let root: Root;
let suggestion: ReturnType<typeof useCategorySuggestion>;
const TestHook = () => {
	suggestion = useCategorySuggestion({
		currentCategoryId: mocks.values.categoryId,
		currentMemoId: 1,
		onCategorySelect: mocks.onSelect,
		onCategoryAutoApply: mocks.onAutoApply,
	});
	return null;
};
const render = async () => {
	await act(async () => root.render(createElement(TestHook)));
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.values.categoryId = null;
	mocks.tab = { url: "https://example.com/a", title: "Article" };
	mocks.request.mockReset();
	mocks.createCategory.mockReset();
	mocks.trackEvent.mockReset();
	mocks.getStorage.mockReset().mockResolvedValue(true);
	mocks.onSelect.mockReset().mockImplementation((categoryId: number | null) => {
		mocks.values.categoryId = categoryId;
	});
	mocks.onAutoApply.mockReset();
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("Jev가 고른 기존 카테고리만 자동 적용하고 되돌리면 같은 URL에서 다시 제안하지 않는다", async () => {
	mocks.request.mockResolvedValue({
		categoryName: "개발",
		isExisting: true,
		existingCategoryId: 7,
		confidence: 0.9,
		source: "jev",
	});
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	expect(mocks.onSelect).toHaveBeenCalledWith(7, "ai");
	expect(mocks.onAutoApply).toHaveBeenCalledTimes(1);
	await act(async () => mocks.onAutoApply.mock.calls[0][1]());
	expect(mocks.onSelect).toHaveBeenCalledWith(null, "ai");
	await act(async () => suggestion.triggerSuggestion("memo updated"));
	expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("LLM의 새 이름은 자동 생성하지 않고 수락할 때만 만든다", async () => {
	mocks.request.mockResolvedValue({
		categoryName: "프론트엔드 성능",
		isExisting: false,
		existingCategoryId: null,
		confidence: 0.9,
		source: "llm",
	});
	mocks.createCategory.mockResolvedValue({ data: [{ id: 12 }] });
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	expect(suggestion.suggestion?.categoryName).toBe("프론트엔드 성능");
	expect(mocks.createCategory).not.toHaveBeenCalled();
	expect(mocks.onSelect).not.toHaveBeenCalled();
	await act(async () => suggestion.acceptSuggestion());
	expect(mocks.createCategory).toHaveBeenCalledTimes(1);
	expect(mocks.onSelect).toHaveBeenCalledWith(12, "ai");
});

it("제안 후 다른 URL로 이동하면 오래된 칩을 수락해도 카테고리를 만들지 않는다", async () => {
	mocks.request.mockResolvedValue({
		categoryName: "프론트엔드 성능",
		isExisting: false,
		existingCategoryId: null,
		confidence: 0.9,
		source: "llm",
	});
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	expect(suggestion.suggestion).not.toBeNull();
	mocks.tab = { url: "https://example.com/b", title: "Another article" };
	await act(async () => suggestion.acceptSuggestion());
	expect(suggestion.suggestion).toBeNull();
	expect(mocks.createCategory).not.toHaveBeenCalled();
	expect(mocks.onSelect).not.toHaveBeenCalled();
	await render();
	expect(suggestion.suggestion).toBeNull();
});

it("다른 URL의 메모 화면에서는 이전 페이지 자동 적용을 되돌리지 않는다", async () => {
	mocks.request.mockResolvedValue({
		categoryName: "개발",
		isExisting: true,
		existingCategoryId: 7,
		confidence: 0.9,
		source: "jev",
	});
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	mocks.tab = { url: "https://example.com/b", title: "Another article" };
	await act(async () => mocks.onAutoApply.mock.calls[0][1]());
	expect(mocks.onSelect).toHaveBeenCalledTimes(1);
	expect(mocks.values.categoryId).toBe(7);
	expect(mocks.trackEvent).not.toHaveBeenCalledWith({
		name: "category_suggestion_undo",
		params: { source: "jev" },
	});
});

it("자동 적용 설정을 기다리는 동안 URL이 바뀌면 이전 결과를 적용하지 않는다", async () => {
	mocks.request.mockResolvedValue({
		categoryName: "개발",
		isExisting: true,
		existingCategoryId: 7,
		confidence: 0.9,
		source: "jev",
	});
	let resolveSetting: (value: boolean) => void = () => {};
	mocks.getStorage.mockImplementation(
		() =>
			new Promise<boolean>((resolve) => {
				resolveSetting = resolve;
			}),
	);
	await render();
	await act(async () => {
		const pendingSuggestion = suggestion.triggerSuggestion("memo");
		for (let attempt = 0; attempt < 6; attempt += 1) {
			await Promise.resolve();
		}
		expect(mocks.getStorage).toHaveBeenCalledTimes(1);
		mocks.tab = { url: "https://example.com/b", title: "Another article" };
		resolveSetting(true);
		await pendingSuggestion;
	});
	expect(mocks.onSelect).not.toHaveBeenCalled();
	expect(mocks.onAutoApply).not.toHaveBeenCalled();
	expect(suggestion.suggestion).toBeNull();
});

it("제안에 포커스가 있는 동안 15초 타이머가 멈추고, 다시 시작한 뒤 거절한다", async () => {
	mocks.request.mockResolvedValue({
		categoryName: "개발",
		isExisting: true,
		existingCategoryId: 7,
		confidence: 0.9,
		source: "jev",
	});
	mocks.getStorage.mockResolvedValue(false);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	await act(async () => suggestion.pauseAutoDismiss());
	await act(async () => vi.advanceTimersByTimeAsync(20000));
	expect(suggestion.suggestion).not.toBeNull();
	await act(async () => suggestion.resumeAutoDismiss());
	await act(async () => vi.advanceTimersByTimeAsync(15000));
	expect(suggestion.suggestion).toBeNull();
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "category_suggestion_dismiss",
		params: { source: "jev", is_new_category: false },
	});
});
