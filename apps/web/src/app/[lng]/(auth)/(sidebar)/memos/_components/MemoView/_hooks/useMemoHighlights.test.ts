// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMemoHighlights } from "./useMemoHighlights";

const mocks = vi.hoisted(() => ({ query: vi.fn(), getHighlights: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("@web-memo/shared/hooks", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
}));
vi.mock("@web-memo/shared/utils", () => ({
	HighlightService: class {
		getHighlightsByUrls = mocks.getHighlights;
	},
}));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("메모 하이라이트 조회 훅", () => {
	it("조회 실패 상태와 재시도를 UI에 전달한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const refetch = vi.fn();
		mocks.query.mockReturnValue({ data: undefined, isError: true, refetch });
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(useMemoHighlights(["https://a.com"]));
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(results[0].isHighlightLoadError).toBe(true);
		expect(results[0].refetchHighlights).toBe(refetch);
		await act(async () => root.unmount());
	});
	it("URL을 중복 제거하고 정확한 URL별로 분리하며 오류를 전달한다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const rows = [
			{ id: 1, url: "https://a.com" },
			{ id: 2, url: "https://a.com/" },
			{ id: 3, url: "https://a.com" },
		];
		mocks.query.mockReturnValue({ data: rows });
		const results: ReturnType<typeof useMemoHighlights>[] = [];
		const TestHook = () => {
			results.push(
				useMemoHighlights(["https://a.com/", "https://a.com", "https://a.com"]),
			);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(results[0].highlightsByUrl.get("https://a.com")).toEqual([
			rows[0],
			rows[2],
		]);
		expect(results[0].highlightsByUrl.get("https://a.com/")).toEqual([rows[1]]);
		const options = mocks.query.mock.calls[0][0];
		expect(options.queryKey).toEqual([
			"highlights",
			"byUrls",
			["https://a.com", "https://a.com/"],
		]);
		mocks.getHighlights.mockResolvedValue({ data: rows, error: null });
		expect(await options.queryFn()).toEqual(rows);
		expect(mocks.getHighlights).toHaveBeenCalledWith([
			"https://a.com",
			"https://a.com/",
		]);
		mocks.getHighlights.mockResolvedValue({
			data: null,
			error: { message: "조회 실패" },
		});
		await expect(options.queryFn()).rejects.toThrow("조회 실패");
		await act(async () => root.unmount());
	});
	it("빈 URL 목록은 조회하지 않는다", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		mocks.query.mockReturnValue({ data: undefined });
		const TestHook = () => {
			useMemoHighlights([]);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		await act(async () => root.render(createElement(TestHook)));
		expect(mocks.query.mock.calls[0][0].enabled).toBe(false);
		await act(async () => root.unmount());
	});
});
