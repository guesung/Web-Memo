// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCategorySuggestion } from "./useCategorySuggestion";

const mocks = vi.hoisted(() => ({
	request: vi.fn(),
	trackEvent: vi.fn(),
	toast: vi.fn(),
	getTabInfo: vi.fn(),
	onSelect: vi.fn(),
	getValues: vi.fn(),
	values: { categoryId: null as number | null, memo: "첫 메모" },
	categories: [{ id: 7, name: "개발" }] as
		| { id: number; name: string }[]
		| undefined,
	currentMemoId: 1 as number | null,
	firstSavedMemoId: null as number | null,
	isFirstSavedMemoReady: false,
	tab: { url: "https://example.com/a", title: "Article" },
}));

vi.mock("./requestCategorySuggestion", () => ({
	requestCategorySuggestion: mocks.request,
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useCategoryQuery: () => ({ categories: mocks.categories }),
	useTabQuery: () => ({ data: mocks.tab }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/ui", () => ({ toast: mocks.toast }));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getTabInfo: mocks.getTabInfo,
	I18n: { get: (key: string) => key },
}));
vi.mock("@sentry/react", () => ({ captureException: vi.fn() }));
vi.mock("react-hook-form", () => ({
	useFormContext: () => ({
		getValues: mocks.getValues,
	}),
}));

let root: Root;
let suggestion: ReturnType<typeof useCategorySuggestion>;
const TestHook = () => {
	suggestion = useCategorySuggestion({
		currentCategoryId: mocks.values.categoryId,
		currentMemoId: mocks.currentMemoId,
		firstSavedMemoId: mocks.firstSavedMemoId,
		isFirstSavedMemoReady: mocks.isFirstSavedMemoReady,
		onCategorySelect: mocks.onSelect,
	});
	return null;
};
const render = async () => {
	await act(async () => root.render(createElement(TestHook)));
};
const jevSuggestion = {
	categoryName: "개발",
	isExisting: true,
	existingCategoryId: 7,
	confidence: 0.2,
	source: "jev",
} as const;

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.values.categoryId = null;
	mocks.values.memo = "첫 메모";
	mocks.categories = [{ id: 7, name: "개발" }];
	mocks.currentMemoId = 1;
	mocks.firstSavedMemoId = null;
	mocks.isFirstSavedMemoReady = false;
	mocks.tab = { url: "https://example.com/a", title: "Article" };
	mocks.request.mockReset();
	mocks.trackEvent.mockReset();
	mocks.toast.mockReset();
	mocks.getTabInfo.mockReset().mockImplementation(async () => mocks.tab);
	mocks.getValues
		.mockReset()
		.mockImplementation((key: "categoryId" | "memo") => mocks.values[key]);
	mocks.onSelect.mockReset().mockImplementation((categoryId: number | null) => {
		mocks.values.categoryId = categoryId;
	});
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("낮은 확신도의 Jev 선택도 자동 적용 없이 제안하고 수락 시 적용한다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	expect(suggestion.suggestion?.categoryName).toBe("개발");
	expect(mocks.onSelect).not.toHaveBeenCalled();
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "category_suggestion_show",
		params: { source: "jev", is_new_category: false },
	});
	await act(async () => suggestion.acceptSuggestion());
	expect(mocks.onSelect).toHaveBeenCalledWith(7, "ai");
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "category_suggestion_apply",
		params: { source: "jev", is_new_category: false },
	});
});

it("첫 저장이 반영되면 현재 메모로 한 번 추천한다", async () => {
	mocks.request.mockResolvedValue(null);
	mocks.currentMemoId = null;
	await render();
	expect(mocks.request).not.toHaveBeenCalled();
	mocks.currentMemoId = 42;
	mocks.firstSavedMemoId = 42;
	mocks.isFirstSavedMemoReady = true;
	await render();
	expect(mocks.request).toHaveBeenCalledTimes(1);
	expect(mocks.request.mock.calls[0][0].memoText).toBe("첫 메모");
	await render();
	expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("첫 저장 후 카테고리 조회가 완료되면 추천을 시작한다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	mocks.categories = undefined;
	mocks.currentMemoId = 42;
	mocks.firstSavedMemoId = 42;
	mocks.isFirstSavedMemoReady = true;
	await render();
	expect(mocks.request).not.toHaveBeenCalled();

	mocks.categories = [{ id: 7, name: "개발" }];
	await render();
	expect(mocks.request).toHaveBeenCalledTimes(1);
	expect(suggestion.suggestion?.existingCategoryId).toBe(7);
});

it("첫 저장 전에 기존 입력 경로가 추천했으면 중복 요청하지 않는다", async () => {
	mocks.request.mockResolvedValue(null);
	mocks.currentMemoId = 42;
	await render();
	await act(async () => suggestion.triggerSuggestion("추가 입력"));
	mocks.firstSavedMemoId = 42;
	mocks.isFirstSavedMemoReady = true;
	await render();
	expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("카테고리 없음·빈 응답·목록 밖 선택은 제안하지 않는다", async () => {
	mocks.categories = [];
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	expect(mocks.request).not.toHaveBeenCalled();
	mocks.categories = [{ id: 7, name: "개발" }];
	await render();
	for (const response of [
		null,
		{ ...jevSuggestion, existingCategoryId: 8 },
		{ ...jevSuggestion, isExisting: false },
	]) {
		mocks.request.mockResolvedValueOnce(response);
		await act(async () => suggestion.triggerSuggestion("memo"));
		expect(suggestion.suggestion).toBeNull();
	}
});

it("다른 페이지로 이동한 뒤 이전 제안을 수락하지 않는다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	mocks.tab = { url: "https://example.com/b", title: "Another article" };
	await act(async () => suggestion.acceptSuggestion());
	expect(suggestion.suggestion).toBeNull();
	expect(mocks.onSelect).not.toHaveBeenCalled();
});

it("수락 중 페이지 정보 조회가 실패하면 제안을 유지하고 오류를 알린다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	mocks.getTabInfo.mockRejectedValueOnce(new Error("tab unavailable"));
	await act(async () => suggestion.acceptSuggestion());
	expect(suggestion.suggestion?.existingCategoryId).toBe(7);
	expect(mocks.onSelect).not.toHaveBeenCalled();
	expect(mocks.toast).toHaveBeenCalledWith({
		title: "category_suggestion_apply_failed",
	});
});

it("거절한 URL은 다시 추천하지 않고 Jev 거절 이벤트를 남긴다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	await act(async () => suggestion.dismissSuggestion());
	await act(async () => suggestion.triggerSuggestion("memo updated"));
	expect(mocks.request).toHaveBeenCalledTimes(1);
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "category_suggestion_dismiss",
		params: { source: "jev", is_new_category: false },
	});
});

it("제안을 받은 뒤 메모가 바뀌면 이전 메모의 제안을 지운다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	expect(suggestion.suggestion?.existingCategoryId).toBe(7);
	mocks.currentMemoId = 2;
	await render();
	expect(suggestion.suggestion).toBeNull();
});

it("카테고리를 적용했다가 제거하면 추가 입력에 다시 추천한다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	await act(async () => suggestion.acceptSuggestion());
	await render();
	mocks.values.categoryId = null;
	await render();
	await act(async () => suggestion.triggerSuggestion("memo updated"));
	expect(mocks.request).toHaveBeenCalledTimes(2);
	expect(suggestion.suggestion?.existingCategoryId).toBe(7);
});

it("사용자가 결정하기 전에는 제안이 15초 뒤에도 유지된다", async () => {
	mocks.request.mockResolvedValue(jevSuggestion);
	await render();
	await act(async () => suggestion.triggerSuggestion("memo"));
	await act(async () => vi.advanceTimersByTimeAsync(30000));
	expect(suggestion.suggestion?.existingCategoryId).toBe(7);
	expect(mocks.trackEvent).not.toHaveBeenCalledWith({
		name: "category_suggestion_dismiss",
		params: { source: "jev", is_new_category: false },
	});
});
