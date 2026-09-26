// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import usePendingOfflineMemo from "./usePendingOfflineMemo";

const mocks = vi.hoisted(() => ({
	hasPendingOfflineMemo: vi.fn(async (_target: unknown) => false),
}));
vi.mock("../utils/offlineMemoQueue", () => ({
	hasPendingOfflineMemo: (target: unknown) =>
		mocks.hasPendingOfflineMemo(target),
	OFFLINE_MEMO_QUEUE_STORAGE_KEY: "offlineMemoQueue",
}));

let root: Root;
let storageChangeListeners: Array<
	(changes: Record<string, unknown>, areaName: string) => void
> = [];
const fireStorageChange = (areaName = "local") => {
	for (const listener of storageChangeListeners) {
		listener({ offlineMemoQueue: {} }, areaName);
	}
};

let hookResult: boolean | undefined;
const TestHook = ({ memoId, url }: { memoId?: number; url: string }) => {
	hookResult = usePendingOfflineMemo({ memoId, url });
	return null;
};

const render = async (props: { memoId?: number; url: string }) => {
	await act(async () => root.render(createElement(TestHook, props)));
};

beforeEach(() => {
	mocks.hasPendingOfflineMemo.mockReset().mockResolvedValue(false);
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

it("마운트 시 대상의 대기 여부를 읽는다", async () => {
	mocks.hasPendingOfflineMemo.mockResolvedValue(true);
	await render({ memoId: 1, url: "https://example.com/a" });

	expect(hookResult).toBe(true);
	expect(mocks.hasPendingOfflineMemo).toHaveBeenCalledWith({
		memoId: 1,
		url: "https://example.com/a",
	});
});

it("대기열이 바뀌면 다시 읽는다", async () => {
	await render({ memoId: 1, url: "https://example.com/a" });
	expect(hookResult).toBe(false);

	mocks.hasPendingOfflineMemo.mockResolvedValue(true);
	await act(async () => {
		fireStorageChange();
	});

	expect(hookResult).toBe(true);
});

it("local이 아닌 영역의 변경은 무시한다", async () => {
	await render({ memoId: 1, url: "https://example.com/a" });
	mocks.hasPendingOfflineMemo.mockClear();

	await act(async () => {
		fireStorageChange("sync");
	});

	expect(mocks.hasPendingOfflineMemo).not.toHaveBeenCalled();
});

it("대상(memoId·url)이 바뀌면 새 대상으로 다시 읽는다", async () => {
	await render({ memoId: 1, url: "https://example.com/a" });
	mocks.hasPendingOfflineMemo.mockClear().mockResolvedValue(true);

	await render({ memoId: 2, url: "https://example.com/b" });

	expect(mocks.hasPendingOfflineMemo).toHaveBeenCalledWith({
		memoId: 2,
		url: "https://example.com/b",
	});
	expect(hookResult).toBe(true);
});
