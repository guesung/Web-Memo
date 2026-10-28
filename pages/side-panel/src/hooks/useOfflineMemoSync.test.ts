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
	OFFLINE_MEMO_QUEUE_STORAGE_KEY: "offlineMemoQueue",
}));

let root: Root;
let queryClient: QueryClient;
let hookResult: ReturnType<typeof useOfflineMemoSync>;
const onConflict = vi.fn();
let storageChangeListeners: Array<
	(changes: Record<string, unknown>, areaName: string) => void
> = [];
const fireStorageChange = (areaName = "local") => {
	for (const listener of storageChangeListeners) {
		listener({ offlineMemoQueue: {} }, areaName);
	}
};

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
	storageChangeListeners = [];
	vi.stubGlobal("chrome", {
		storage: {
			onChanged: {
				addListener: (
					listener: (
						changes: Record<string, unknown>,
						areaName: string,
					) => void,
				) => {
					storageChangeListeners.push(listener);
				},
				removeListener: (
					listener: (
						changes: Record<string, unknown>,
						areaName: string,
					) => void,
				) => {
					storageChangeListeners = storageChangeListeners.filter(
						(existing) => existing !== listener,
					);
				},
			},
		},
	});
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
			queue_contract_version: 2,
			attempted_count: 0,
			network_error_count: 0,
			other_error_count: 0,
			ack_latency_sum_ms: 0,
			ack_latency_count: 0,
			no_op_count: 0,
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
			queue_contract_version: 2,
			attempted_count: 0,
			network_error_count: 0,
			other_error_count: 0,
			ack_latency_sum_ms: 0,
			ack_latency_count: 0,
			no_op_count: 0,
		},
	});
});

it("온라인 상태에서 대기열이 바뀌면 곧바로 flush한다", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [],
		syncedCount: 1,
		hasNetworkError: false,
		hasOtherError: false,
	});
	vi.stubGlobal("navigator", { onLine: true });
	await render("user-1");
	expect(mocks.flush).toHaveBeenCalledTimes(1);

	await act(async () => {
		fireStorageChange();
	});

	expect(mocks.flush).toHaveBeenCalledTimes(2);
	expect(mocks.trackEvent).toHaveBeenLastCalledWith({
		name: "memo_offline_sync_result",
		params: {
			trigger: "enqueue",
			synced_count: 1,
			conflict_count: 0,
			has_other_error: false,
			queue_contract_version: 2,
			attempted_count: 0,
			network_error_count: 0,
			other_error_count: 0,
			ack_latency_sum_ms: 0,
			ack_latency_count: 0,
			no_op_count: 0,
		},
	});
});

it("오프라인 상태에서는 대기열이 바뀌어도 flush하지 않는다", async () => {
	vi.stubGlobal("navigator", { onLine: false });
	await render("user-1");
	mocks.flush.mockClear();

	await act(async () => {
		fireStorageChange();
	});

	expect(mocks.flush).not.toHaveBeenCalled();
});

it("local이 아닌 영역의 변경은 무시한다", async () => {
	vi.stubGlobal("navigator", { onLine: true });
	await render("user-1");
	mocks.flush.mockClear();

	await act(async () => {
		fireStorageChange("sync");
	});

	expect(mocks.flush).not.toHaveBeenCalled();
});

it("flush rejection becomes syncFailed and can be retried", async () => {
	mocks.flush.mockRejectedValueOnce(new Error("storage failed"));
	await render("user-1");
	expect(hookResult.syncStatus).toBe("syncFailed");
	await act(async () => {
		await hookResult.retrySync();
	});
	expect(mocks.flush).toHaveBeenCalledTimes(2);
	expect(hookResult.syncStatus).toBe("idle");
});

it("account switch suppresses old results and flushes the new account", async () => {
	let release!: (value: unknown) => void;
	mocks.flush.mockReturnValueOnce(
		new Promise((resolve) => {
			release = resolve;
		}),
	);
	await render("user-a");
	await render("user-b");
	await act(async () =>
		release({
			conflicts: [{ oldMemoId: 1, newMemoId: 2, url: "https://example.com/a" }],
			syncedCount: 1,
			hasNetworkError: false,
			hasOtherError: false,
		}),
	);
	expect(onConflict).not.toHaveBeenCalled();
	expect(mocks.flush.mock.calls.at(-1)?.[0]).toMatchObject({
		userId: "user-b",
	});
});

it("storage event during flush schedules one trailing pass", async () => {
	let release!: (value: unknown) => void;
	mocks.flush.mockReturnValueOnce(
		new Promise((resolve) => {
			release = resolve;
		}),
	);
	vi.stubGlobal("navigator", { onLine: true });
	await render("user-1");
	await act(async () => {
		fireStorageChange();
		fireStorageChange();
	});
	expect(mocks.flush).toHaveBeenCalledTimes(1);
	await act(async () =>
		release({
			conflicts: [],
			syncedCount: 0,
			hasNetworkError: false,
			hasOtherError: false,
		}),
	);
	expect(mocks.flush).toHaveBeenCalledTimes(2);
});

it("A→B→A does not authorize the old A flush snapshot", async () => {
	let release!: (value: unknown) => void;
	mocks.flush.mockReturnValueOnce(
		new Promise((resolve) => {
			release = resolve;
		}),
	);
	await render("user-a");
	const oldSnapshot = mocks.flush.mock.calls[0][0];
	expect(oldSnapshot.shouldContinue()).toBe(true);
	await render("user-b");
	await render("user-a");
	expect(oldSnapshot.shouldContinue()).toBe(false);
	await act(async () =>
		release({
			conflicts: [],
			syncedCount: 0,
			hasNetworkError: false,
			hasOtherError: false,
		}),
	);
});

it("unmount cancels the active flush scope", async () => {
	mocks.flush.mockReturnValueOnce(new Promise(() => {}));
	await render("user-a");
	const oldSnapshot = mocks.flush.mock.calls[0][0];
	await act(async () => root.unmount());
	expect(oldSnapshot.shouldContinue()).toBe(false);
	root = createRoot(document.createElement("div"));
});

it("v2 event counts attempts and acknowledged conflicts without private data", async () => {
	mocks.flush.mockResolvedValue({
		conflicts: [
			{ oldMemoId: 17, newMemoId: 18, url: "https://private.example/a" },
		],
		syncedCount: 1,
		hasNetworkError: true,
		hasOtherError: false,
		attemptedCount: 2,
		networkErrorCount: 1,
		otherErrorCount: 0,
		remainingCount: 1,
		ackLatencySumMs: 240,
		ackLatencyCount: 1,
		noOpCount: 1,
		acknowledgedConflictCount: 0,
	});
	await render("private-user");
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "memo_offline_sync_result",
		params: {
			trigger: "mount",
			synced_count: 1,
			conflict_count: 0,
			has_other_error: false,
			queue_contract_version: 2,
			attempted_count: 2,
			network_error_count: 1,
			other_error_count: 0,
			remaining_count: 1,
			ack_latency_sum_ms: 240,
			ack_latency_count: 1,
			no_op_count: 1,
		},
	});
});

it("preflight rejection emits other error without unknown remaining count", async () => {
	mocks.flush.mockRejectedValueOnce(new Error("storage contains private data"));
	await render("private-user");
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "memo_offline_sync_result",
		params: {
			trigger: "mount",
			synced_count: 0,
			conflict_count: 0,
			has_other_error: true,
			queue_contract_version: 2,
			attempted_count: 0,
			network_error_count: 0,
			other_error_count: 1,
			ack_latency_sum_ms: 0,
			ack_latency_count: 0,
			no_op_count: 0,
		},
	});
});

it("network-only attempt emits result and analytics rejection is contained", async () => {
	mocks.trackEvent.mockRejectedValueOnce(new Error("telemetry failed"));
	mocks.flush.mockResolvedValue({
		conflicts: [],
		syncedCount: 0,
		hasNetworkError: true,
		hasOtherError: false,
		attemptedCount: 1,
		networkErrorCount: 1,
		otherErrorCount: 0,
		ackLatencySumMs: 0,
		ackLatencyCount: 0,
		noOpCount: 0,
		acknowledgedConflictCount: 0,
	});
	await render("user-1");
	expect(hookResult.syncStatus).toBe("idle");
	expect(mocks.trackEvent).toHaveBeenCalledTimes(1);
});
