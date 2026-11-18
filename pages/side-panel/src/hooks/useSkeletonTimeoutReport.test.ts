// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useSkeletonTimeoutReport, {
	SKELETON_TIMEOUT_MS,
} from "./useSkeletonTimeoutReport";

const mocks = vi.hoisted(() => ({ reportSkeletonTimeout: vi.fn() }));
vi.mock("../utils/reportLoginFailure", () => ({
	reportSkeletonTimeout: (...args: unknown[]) =>
		mocks.reportSkeletonTimeout(...args),
}));

let root: Root;
let queryClient: QueryClient;

const TestHook = () => {
	useSkeletonTimeoutReport();
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
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.reportSkeletonTimeout.mockClear();
	queryClient = new QueryClient();
	root = createRoot(document.createElement("div"));
});

afterEach(() => {
	act(() => root.unmount());
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it("5초 안에 사라지면 보고하지 않는다", async () => {
	await render();
	act(() => vi.advanceTimersByTime(SKELETON_TIMEOUT_MS - 1));
	act(() => root.unmount());
	act(() => vi.advanceTimersByTime(SKELETON_TIMEOUT_MS));

	expect(mocks.reportSkeletonTimeout).not.toHaveBeenCalled();
	root = createRoot(document.createElement("div"));
});

it("5초를 넘겨 남아 있으면 한 번만 보고한다", async () => {
	await render();
	act(() => vi.advanceTimersByTime(SKELETON_TIMEOUT_MS * 3));

	expect(mocks.reportSkeletonTimeout).toHaveBeenCalledOnce();
	expect(mocks.reportSkeletonTimeout).toHaveBeenCalledWith(
		queryClient,
		SKELETON_TIMEOUT_MS,
	);
});
