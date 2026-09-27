// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import usePendingOfflineMemo from "./usePendingOfflineMemo";

const mocks = vi.hoisted(() => ({
	getPendingOfflineMemo: vi.fn(
		async (_target: unknown): Promise<unknown> => undefined,
	),
}));
vi.mock("../utils/offlineMemoQueue", () => ({
	getPendingOfflineMemo: (target: unknown) =>
		mocks.getPendingOfflineMemo(target),
	OFFLINE_MEMO_QUEUE_STORAGE_KEY: "offlineMemoQueue",
}));

const PENDING_ITEM = {
	url: "https://example.com/a",
	data: { memo: "대기 본문" },
};
let root: Root;
let storageChangeListeners: Array<
	(changes: Record<string, unknown>, areaName: string) => void
> = [];
const fireStorageChange = (areaName = "local") => {
	for (const listener of storageChangeListeners) {
		listener({ offlineMemoQueue: {} }, areaName);
	}
};

let hookResult: unknown;
const TestHook = ({ memoId, url }: { memoId?: number; url: string }) => {
	hookResult = usePendingOfflineMemo({ memoId, url });
	return null;
};

const render = async (props: { memoId?: number; url: string }) => {
	await act(async () => root.render(createElement(TestHook, props)));
};

beforeEach(() => {
	mocks.getPendingOfflineMemo.mockReset().mockResolvedValue(undefined);
	storageChangeListeners = [];
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("마운트 시 대상의 대기 항목을 읽는다", async () => {
	mocks.getPendingOfflineMemo.mockResolvedValue(PENDING_ITEM);
	await render({ memoId: 1, url: "https://example.com/a" });

	expect(hookResult).toBe(PENDING_ITEM);
	expect(mocks.getPendingOfflineMemo).toHaveBeenCalledWith({
		memoId: 1,
		url: "https://example.com/a",
	});
});

it("대기열이 바뀌면 다시 읽는다", async () => {
	await render({ memoId: 1, url: "https://example.com/a" });
	expect(hookResult).toBeUndefined();

	mocks.getPendingOfflineMemo.mockResolvedValue(PENDING_ITEM);
	await act(async () => {
		fireStorageChange();
	});

	expect(hookResult).toBe(PENDING_ITEM);
});

it("local이 아닌 영역의 변경은 무시한다", async () => {
	await render({ memoId: 1, url: "https://example.com/a" });
	mocks.getPendingOfflineMemo.mockClear();

	await act(async () => {
		fireStorageChange("sync");
	});

	expect(mocks.getPendingOfflineMemo).not.toHaveBeenCalled();
});

it("대상(memoId·url)이 바뀌면 새 대상으로 다시 읽는다", async () => {
	await render({ memoId: 1, url: "https://example.com/a" });
	mocks.getPendingOfflineMemo.mockClear().mockResolvedValue(PENDING_ITEM);

	await render({ memoId: 2, url: "https://example.com/b" });

	expect(mocks.getPendingOfflineMemo).toHaveBeenCalledWith({
		memoId: 2,
		url: "https://example.com/b",
	});
	expect(hookResult).toBe(PENDING_ITEM);
});
