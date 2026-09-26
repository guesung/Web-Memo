// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useMemoCandidatesQuery from "./useMemoCandidatesQuery";

type TQueryResult = {
	data: unknown[] | null;
	error: { message: string } | null;
};

const mocks = vi.hoisted(() => ({
	memoQueryImpl: vi.fn(),
	samePathQueryImpl: vi.fn(),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
	memoQueryOptions: ({ url }: { url?: string }) => ({
		queryKey: ["test-memo", url],
		queryFn: mocks.memoQueryImpl,
	}),
	samePathMemoQueryOptions: ({ url }: { url: string }) => ({
		queryKey: ["test-same-path", url],
		queryFn: mocks.samePathQueryImpl,
	}),
}));

const PAGE_URL = "https://example.com/a";
const EMPTY_RESULT: TQueryResult = { data: [], error: null };
let root: Root;
let queryClient: QueryClient;
let candidates: ReturnType<typeof useMemoCandidatesQuery>;
const TestHook = () => {
	candidates = useMemoCandidatesQuery({ url: PAGE_URL });
	return null;
};
const render = async () => {
	await act(async () =>
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(TestHook),
			),
		),
	);
	await flushQueries();
};
// React Query는 조회 결과를 setTimeout(0)으로 모아 알린다. 가짜 타이머를 흘려 결과를 반영한다.
const flushQueries = async () => {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
};
const pendingForever = () => new Promise<TQueryResult>(() => {});

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.memoQueryImpl.mockReset().mockResolvedValue(EMPTY_RESULT);
	mocks.samePathQueryImpl.mockReset().mockResolvedValue(EMPTY_RESULT);
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("메모 후보 조회가 끝나지 않으면 잠그고 실패로 보지 않는다", async () => {
	mocks.memoQueryImpl.mockImplementation(pendingForever);
	await render();

	expect(candidates.isMemoLocked).toBe(true);
	expect(candidates.isMemoLoadFailed).toBe(false);
});

it("메모 후보가 도착해도 같은 경로 후보를 기다리는 동안은 잠금을 유지한다", async () => {
	mocks.memoQueryImpl.mockResolvedValue({ data: [{ id: 1 }], error: null });
	mocks.samePathQueryImpl.mockImplementation(pendingForever);
	await render();

	expect(candidates.isMemoLocked).toBe(true);
	expect(candidates.memos).toEqual([{ id: 1 }]);
});

it("두 조회가 모두 도착하면 잠금을 풀고 후보를 돌려준다", async () => {
	mocks.memoQueryImpl.mockResolvedValue({ data: [{ id: 1 }], error: null });
	mocks.samePathQueryImpl.mockResolvedValue({
		data: [{ id: 1 }, { id: 2 }],
		error: null,
	});
	await render();

	expect(candidates.isMemoLocked).toBe(false);
	expect(candidates.isMemoLoadFailed).toBe(false);
	expect(candidates.memos).toEqual([{ id: 1 }]);
	expect(candidates.samePathMemos).toEqual([{ id: 1 }, { id: 2 }]);
});

it("조회가 데이터 없이 throw로 실패하면 잠근 채 실패로 본다", async () => {
	mocks.memoQueryImpl.mockRejectedValue(new Error("Internal Server Error"));
	await render();

	expect(candidates.isMemoLocked).toBe(true);
	expect(candidates.isMemoLoadFailed).toBe(true);
});

it("조회 응답에 error가 담겨 오면 실패로 보고 잠근다", async () => {
	mocks.samePathQueryImpl.mockResolvedValue({
		data: null,
		error: { message: "Internal Server Error" },
	});
	await render();

	expect(candidates.isMemoLocked).toBe(true);
	expect(candidates.isMemoLoadFailed).toBe(true);
});

it("실패 뒤 다시 시도하는 동안에는 실패가 아니라 대기로 보고 잠금을 유지한다", async () => {
	mocks.memoQueryImpl.mockRejectedValue(new Error("Internal Server Error"));
	await render();
	expect(candidates.isMemoLoadFailed).toBe(true);

	mocks.memoQueryImpl.mockImplementation(pendingForever);
	await act(async () => {
		void candidates.refetchMemoCandidates();
	});
	await flushQueries();

	expect(candidates.isMemoLocked).toBe(true);
	expect(candidates.isMemoLoadFailed).toBe(false);
});

it("다시 시도가 성공하면 잠금을 푼다", async () => {
	mocks.memoQueryImpl.mockRejectedValue(new Error("Internal Server Error"));
	await render();

	mocks.memoQueryImpl.mockResolvedValue(EMPTY_RESULT);
	await act(async () => {
		await candidates.refetchMemoCandidates();
	});
	await flushQueries();

	expect(candidates.isMemoLocked).toBe(false);
	expect(candidates.isMemoLoadFailed).toBe(false);
	expect(mocks.samePathQueryImpl).toHaveBeenCalledTimes(2);
});

it("캐시 데이터가 있으면 백그라운드 갱신이 실패해도 잠그지 않는다", async () => {
	queryClient.setQueryData(["test-memo", PAGE_URL], {
		data: [{ id: 1 }],
		error: null,
	});
	queryClient.setQueryData(["test-same-path", PAGE_URL], EMPTY_RESULT);
	await render();

	mocks.memoQueryImpl.mockRejectedValue(new Error("Internal Server Error"));
	await act(async () => {
		await candidates.refetchMemoCandidates();
	});
	await flushQueries();

	expect(candidates.isMemoLocked).toBe(false);
	expect(candidates.isMemoLoadFailed).toBe(false);
	expect(candidates.memos).toEqual([{ id: 1 }]);
});
