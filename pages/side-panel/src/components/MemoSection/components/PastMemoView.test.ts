// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PastMemoTracking } from "../utils/pastMemoTracking";
import PastMemoView from "./PastMemoView";

const mocks = vi.hoisted(() => ({
	query: vi.fn(),
	trackEvent: vi.fn(),
	create: vi.fn(),
	settings: { showImpression: false, showActionItem: false },
}));
vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("../../../utils/formatRelativeDate", () => ({
	formatRelativeDate: () => "date",
}));
vi.mock("../../../utils/getHostname", () => ({
	getHostname: () => "example.com",
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
	useSettingQuery: () => mocks.settings,
	memoQueryOptions: () => ({ queryKey: ["memo", 101], queryFn: mocks.query }),
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
	Tab: { create: mocks.create },
}));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let tracking: PastMemoTracking;
const memo = {
	id: 101,
	user_id: "a",
	memo: "saved body",
	title: "Title",
	url: "https://example.com",
	created_at: "2020-01-01",
	updated_at: null,
	impression: "hidden impression",
	actionItem: "hidden action",
};
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
	mocks.trackEvent.mockReset();
	mocks.query.mockReset();
	mocks.create.mockReset();
	mocks.create.mockResolvedValue(undefined);
	mocks.settings.showImpression = false;
	mocks.settings.showActionItem = false;
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
	tracking = new PastMemoTracking();
	tracking.updateContext("a", "scope");
	mocks.query.mockResolvedValue({ data: [memo], error: null });
});
afterEach(() => {
	act(() => root.unmount());
	client.clear();
	container.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
async function render() {
	const attempt = tracking.current ?? tracking.start("jev");
	if (!attempt) throw new Error("Expected attempt");
	await act(async () => {
		root.render(
			createElement(
				StrictMode,
				null,
				createElement(
					QueryClientProvider,
					{ client },
					createElement(PastMemoView, {
						memoId: 101,
						title: "fallback",
						url: "https://example.com",
						attempt,
						tracking,
						onBackClick: vi.fn(),
					}),
				),
			),
		);
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
}
function results() {
	return mocks.trackEvent.mock.calls
		.map(([event]) => event)
		.filter((event) => event.name === "past_memo_view_result");
}
it("StrictMode와 리렌더에도 DOM 반영 후 성공은 한 번만 확정한다", async () => {
	await render();
	await render();
	expect(container.textContent).toContain("saved body");
	expect(results()).toEqual([
		{
			name: "past_memo_view_result",
			params: {
				source: "jev",
				reason: "displayed",
				is_success: true,
				action: "existing",
			},
		},
	]);
});
it("숨긴 패널은 성공을 보류하고 전경 복귀 후 확정한다", async () => {
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
	await render();
	expect(results()).toEqual([]);
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
	act(() => document.dispatchEvent(new Event("visibilitychange")));
	expect(results()).toHaveLength(1);
});
it("제목과 숨겨진 필드만 있으면 empty_content다", async () => {
	mocks.query.mockResolvedValue({
		data: [{ ...memo, memo: " \n " }],
		error: null,
	});
	await render();
	expect(results()[0].params.reason).toBe("empty_content");
});
it.each(["missing", "error", "response-error"])(
	"%s 결과를 구분한다",
	async (kind) => {
		if (kind === "error")
			mocks.query.mockRejectedValue(new Error("private error"));
		else
			mocks.query.mockResolvedValue({
				data: [],
				error: kind === "response-error" ? { message: "private" } : null,
			});
		await render();
		expect(results()[0].params.reason).toBe(
			kind === "missing" ? "not_found" : "query_error",
		);
	},
);
it("다른 계정 데이터는 표시하지 않고 계정별 queryKey를 쓴다", async () => {
	mocks.query.mockResolvedValue({
		data: [{ ...memo, user_id: "b" }],
		error: null,
	});
	await render();
	expect(container.textContent).not.toContain("saved body");
	expect(results()[0].params.reason).toBe("not_found");
	expect(client.getQueryCache().getAll()[0].queryKey).toEqual([
		"memo",
		101,
		"past-memo-view",
		"a",
		"1",
	]);
});
it("원문 탭 실패에는 reuse가 없고 성공 재클릭은 한 번만 기록한다", async () => {
	await render();
	const button = Array.from(container.querySelectorAll("button")).find((node) =>
		node.textContent?.includes("past_memo_view_open_original"),
	);
	if (!button) throw new Error("Missing original button");
	mocks.create.mockRejectedValueOnce(new Error("blocked"));
	await act(async () => button.click());
	expect(
		mocks.trackEvent.mock.calls.filter(
			([event]) => event.name === "past_memo_reuse",
		),
	).toHaveLength(0);
	await act(async () => {
		button.click();
		button.click();
	});
	expect(
		mocks.trackEvent.mock.calls.filter(
			([event]) => event.name === "past_memo_reuse",
		),
	).toHaveLength(1);
});

it("설정으로 표시되는 소감만 있어도 표시 성공으로 센다", async () => {
	mocks.settings.showImpression = true;
	mocks.query.mockResolvedValue({
		data: [{ ...memo, memo: " " }],
		error: null,
	});
	await render();
	expect(container.textContent).toContain("hidden impression");
	expect(results()[0].params.reason).toBe("displayed");
});
it("유효 캐시가 보이면 백그라운드 조회 오류보다 표시 성공을 우선한다", async () => {
	client.setQueryData(["memo", 101, "past-memo-view", "a", "1"], {
		data: [memo],
		error: null,
	});
	mocks.query.mockRejectedValue(new Error("background error"));
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
	await render();
	expect(results()).toEqual([]);
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
	act(() => document.dispatchEvent(new Event("visibilitychange")));
	expect(results()[0].params.reason).toBe("displayed");
	expect(container.textContent).toContain("saved body");
});
