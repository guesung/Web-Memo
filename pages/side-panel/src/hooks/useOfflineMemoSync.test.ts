// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useOfflineMemoSync from "./useOfflineMemoSync";

const mocks = vi.hoisted(() => ({
	flush: vi.fn(),
	trackEvent: vi.fn(async (_event: unknown) => {}),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useSupabaseClientQuery: () => ({ data: {} }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: (event: unknown) => mocks.trackEvent(event) },
}));
vi.mock("@web-memo/shared/utils", () => ({
	MemoService: class {},
}));
vi.mock("../utils/offlineMemoQueue", () => ({
	flushOfflineMemoQueue: (...args: unknown[]) => mocks.flush(...args),
}));

let root: Root;
let queryClient: QueryClient;
let hookResult: ReturnType<typeof useOfflineMemoSync>;
const onConflict = vi.fn();

const TestHook = ({ userId }: { userId?: string }) => {
	hookResult = useOfflineMemoSync({ userId, onConflict });
	return null;
};

const render = async (userId?: string) => {
	await act(async () =>
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(TestHook, { userId }),
			),
		),
	);
};

beforeEach(() => {
	mocks.flush.mockReset().mockResolvedValue({
		conflicts: [],
		syncedCount: 0,
		hasNetworkError: false,
		hasOtherError: false,
	});
	onConflict.mockReset();
	mocks.trackEvent.mockReset().mockResolvedValue(undefined);
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	queryClient = new QueryClient();
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("사용자가 없으면 flush하지 않는다", async () => {
	await render(undefined);

	expect(mocks.flush).not.toHaveBeenCalled();
	expect(hookResult.syncStatus).toBe("idle");
	expect(mocks.trackEvent).not.toHaveBeenCalled();
});

it("마운트 시 flush하고 성공하면 idle로 끝나며 결과를 기록한다", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [],
		syncedCount: 1,
		hasNetworkError: false,
		hasOtherError: false,
	});

	await render("user-1");

	expect(mocks.flush).toHaveBeenCalledTimes(1);
	expect(mocks.flush.mock.calls[0][0]).toMatchObject({ userId: "user-1" });
	expect(hookResult.syncStatus).toBe("idle");
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "memo_offline_sync_result",
		params: {
			trigger: "mount",
			synced_count: 1,
			conflict_count: 0,
			has_other_error: false,
		},
	});
});

it("처리한 항목이 없으면 결과를 기록하지 않는다", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [],
		syncedCount: 0,
		hasNetworkError: false,
		hasOtherError: false,
	});

	await render("user-1");

	expect(mocks.trackEvent).not.toHaveBeenCalled();
});

it("충돌이 있으면 콜백을 부른다", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [{ oldMemoId: 1, newMemoId: 2, url: "https://example.com/a" }],
		syncedCount: 1,
		hasNetworkError: false,
		hasOtherError: false,
	});

	await render("user-1");

	expect(onConflict).toHaveBeenCalledWith({
		oldMemoId: 1,
		newMemoId: 2,
		url: "https://example.com/a",
	});
});

it("네트워크 오류가 아닌 실패가 있으면 syncFailed로 남는다", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [],
		syncedCount: 0,
		hasNetworkError: false,
		hasOtherError: true,
	});

	await render("user-1");

	expect(hookResult.syncStatus).toBe("syncFailed");
});

it("retrySync를 부르면 다시 flush하고 결과를 retry_click으로 기록한다", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [],
		syncedCount: 1,
		hasNetworkError: false,
		hasOtherError: false,
	});
	await render("user-1");
	expect(mocks.flush).toHaveBeenCalledTimes(1);

	await act(async () => {
		await hookResult.retrySync();
	});

	expect(mocks.flush).toHaveBeenCalledTimes(2);
	expect(mocks.trackEvent).toHaveBeenLastCalledWith({
		name: "memo_offline_sync_result",
		params: {
			trigger: "retry_click",
			synced_count: 1,
			conflict_count: 0,
			has_other_error: false,
		},
	});
});
