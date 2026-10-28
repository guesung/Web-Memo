// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import usePendingOfflineMemo from "./usePendingOfflineMemo";

const mocks = vi.hoisted(() => ({ getPendingOfflineMemo: vi.fn() }));
vi.mock("../utils/offlineMemoQueue", () => ({
	getPendingOfflineMemo: (...args: unknown[]) =>
		mocks.getPendingOfflineMemo(...args),
	OFFLINE_MEMO_QUEUE_STORAGE_KEY: "offlineMemoQueue",
}));

let root: Root;
let result: ReturnType<typeof usePendingOfflineMemo>;
let listeners: Array<(changes: Record<string, unknown>, area: string) => void>;
const Hook = (props: { userId?: string; memoId?: number; url: string }) => {
	result = usePendingOfflineMemo(props);
	return null;
};
const render = async (props: {
	userId?: string;
	memoId?: number;
	url: string;
}) => {
	await act(async () => root.render(createElement(Hook, props)));
};
const deferred = () => {
	let resolve!: (value: unknown) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.getPendingOfflineMemo.mockReset().mockResolvedValue(undefined);
	listeners = [];
	vi.stubGlobal("chrome", {
		storage: {
			onChanged: {
				addListener: (
					listener: (changes: Record<string, unknown>, area: string) => void,
				) => listeners.push(listener),
				removeListener: (
					listener: (changes: Record<string, unknown>, area: string) => void,
				) => {
					listeners = listeners.filter((value) => value !== listener);
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

it("requires a user and distinguishes absent from loading", async () => {
	await render({ url: "https://example.com/a" });
	expect(result.status).toBe("loading");
	expect(mocks.getPendingOfflineMemo).not.toHaveBeenCalled();
	await render({ userId: "a", url: "https://example.com/a" });
	expect(result.status).toBe("absent");
	expect(mocks.getPendingOfflineMemo).toHaveBeenCalledWith({
		userId: "a",
		url: "https://example.com/a",
	});
});

it("hides a previous account immediately and ignores its late result", async () => {
	const old = deferred();
	const next = deferred();
	mocks.getPendingOfflineMemo
		.mockReturnValueOnce(old.promise)
		.mockReturnValueOnce(next.promise);
	await render({ userId: "a", url: "https://example.com/a" });
	await render({ userId: "b", url: "https://example.com/a" });
	expect(result.status).toBe("loading");
	await act(async () => old.resolve({ userId: "a", data: { memo: "secret" } }));
	expect(result.status).toBe("loading");
	await act(async () => next.resolve(undefined));
	expect(result.status).toBe("absent");
});

it("keeps the newest same-scope refresh result", async () => {
	const old = deferred();
	mocks.getPendingOfflineMemo
		.mockReturnValueOnce(old.promise)
		.mockResolvedValueOnce(undefined);
	await render({ userId: "a", url: "https://example.com/a" });
	await act(async () => listeners[0]({ offlineMemoQueue: {} }, "local"));
	expect(result.status).toBe("absent");
	await act(async () => old.resolve({ userId: "a", data: { memo: "stale" } }));
	expect(result.status).toBe("absent");
});

it("reports lookup failure and exposes retry", async () => {
	mocks.getPendingOfflineMemo
		.mockRejectedValueOnce(new Error("storage failed"))
		.mockResolvedValueOnce(undefined);
	await render({ userId: "a", url: "https://example.com/a" });
	expect(result.status).toBe("error");
	await act(async () => {
		await result.refresh();
	});
	expect(result.status).toBe("absent");
});

it("does not reuse a result when returning to a previous scope", async () => {
	const again = deferred();
	mocks.getPendingOfflineMemo
		.mockResolvedValueOnce({ userId: "a", data: { memo: "old" } })
		.mockResolvedValueOnce(undefined)
		.mockReturnValueOnce(again.promise);
	await render({ userId: "a", url: "https://example.com/a" });
	expect(result.status).toBe("present");
	await render({ userId: "b", url: "https://example.com/a" });
	await render({ userId: "a", url: "https://example.com/a" });
	expect(result.status).toBe("loading");
	await act(async () => again.resolve(undefined));
	expect(result.status).toBe("absent");
});
