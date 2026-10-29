// @vitest-environment jsdom
import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { getPageKey } from "@web-memo/shared/utils";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PageHighlights from "./PageHighlights";

const mocks = vi.hoisted(() => ({ getHighlights: vi.fn() }));
vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/hooks", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({ analytics: {} }));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { handle: { HIGHLIGHTS_CHANGED: () => () => {} } },
}));
vi.mock("@web-memo/shared/utils", async (importOriginal) => ({
	...(await importOriginal<typeof import("@web-memo/shared/utils")>()),
	HighlightService: class {
		getHighlightsByUrl = mocks.getHighlights;
	},
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

let root: Root;
let client: QueryClient;
let container: HTMLDivElement;
const onError = vi.fn();
const networkError = {
	message: "TypeError: Failed to fetch (czwtqukymcqoberdoltq.supabase.co)",
	code: "",
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.getHighlights.mockReset();
	onError.mockClear();
	client = new QueryClient({ queryCache: new QueryCache({ onError }) });
	container = document.createElement("div");
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	client.clear();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

async function render(url = "https://example.com/page") {
	await act(async () => {
		root.render(
			createElement(
				QueryClientProvider,
				{ client },
				createElement(PageHighlights, {
					userId: "user-1",
					url,
				}),
			),
		);
	});
}

async function advanceRetries() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(10_000);
	});
}

it("일시적인 연결 실패는 수동 조작 없이 복구하고 최종 오류를 보고하지 않는다", async () => {
	mocks.getHighlights
		.mockResolvedValueOnce({ data: null, error: networkError })
		.mockResolvedValue({ data: [], error: null });
	await render();
	await advanceRetries();

	expect(mocks.getHighlights).toHaveBeenCalledTimes(2);
	expect(container.textContent).toContain("page_highlights_empty");
	expect(onError).not.toHaveBeenCalled();
});

it("브라우저가 직접 던진 네트워크 오류도 자동 복구한다", async () => {
	mocks.getHighlights
		.mockRejectedValueOnce(new TypeError("Failed to fetch"))
		.mockResolvedValue({ data: [], error: null });
	await render();
	await advanceRetries();

	expect(mocks.getHighlights).toHaveBeenCalledTimes(2);
	expect(container.textContent).toContain("page_highlights_empty");
	expect(onError).not.toHaveBeenCalled();
});

it("연결 실패가 지속되면 두 번만 재시도하고 기존 오류 표시와 보고를 유지한다", async () => {
	mocks.getHighlights.mockResolvedValue({ data: null, error: networkError });
	await render();
	await advanceRetries();

	expect(mocks.getHighlights).toHaveBeenCalledTimes(3);
	expect(container.textContent).toContain("page_highlights_load_failed");
	expect(onError).toHaveBeenCalledOnce();
});

it("HTTP·권한 오류는 자동 재시도하지 않고 보고한다", async () => {
	mocks.getHighlights.mockResolvedValue({
		data: null,
		error: { message: "permission denied", code: "42501" },
	});
	await render();
	await advanceRetries();

	expect(mocks.getHighlights).toHaveBeenCalledOnce();
	expect(container.textContent).toContain("page_highlights_load_failed");
	expect(onError).toHaveBeenCalledOnce();
});

it("조회에는 정규화된 pageKey가 아닌 원본 url을 넘긴다", async () => {
	mocks.getHighlights.mockResolvedValue({ data: [], error: null });
	await render("https://example.com/page");

	expect(mocks.getHighlights).toHaveBeenCalledWith("https://example.com/page");
});

it("about:blank에서도 URL 이중 정규화 오류 없이 빈 상태로 끝난다", async () => {
	// 실제 HighlightService처럼 전달받은 값을 getPageKey로 다시 정규화한다.
	mocks.getHighlights.mockImplementation(async (url: string) => {
		getPageKey(url);
		return { data: [], error: null };
	});
	await render("about:blank");
	await advanceRetries();

	expect(mocks.getHighlights).toHaveBeenCalledWith("about:blank");
	expect(container.textContent).toContain("page_highlights_empty");
	expect(container.textContent).not.toContain("page_highlights_load_failed");
	expect(onError).not.toHaveBeenCalled();
});
