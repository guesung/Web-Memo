// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useSyncLoginStatus, { PANEL_LOGIN_EVENT } from "./useSyncLoginStatus";

const mocks = vi.hoisted(() => ({
	syncHandler: undefined as
		| ((payload: { isLoggedIn: boolean } | undefined) => Promise<void>)
		| undefined,
	reportLoginSyncMismatch: vi.fn(async (_client: unknown) => {}),
}));
vi.mock("@web-memo/shared/constants", () => ({
	QUERY_KEY: { supabaseClient: () => ["supabaseClient"], user: () => ["user"] },
}));
vi.mock("@web-memo/shared/hooks", () => ({
	// 렌더마다 같은 핸들러로 덮어쓰기만 하므로 마운트 시점을 따로 흉내 내지 않는다.
	useDidMount: (callback: () => void) => callback(),
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		handle: {
			SYNC_LOGIN_STATUS: (
				handler: (
					payload: { isLoggedIn: boolean } | undefined,
				) => Promise<void>,
			) => {
				mocks.syncHandler = handler;
			},
		},
	},
}));
vi.mock("../utils/reportLoginFailure", () => ({
	reportLoginSyncMismatch: (client: unknown) =>
		mocks.reportLoginSyncMismatch(client),
}));

let root: Root;
let queryClient: QueryClient;

const TestHook = () => {
	useSyncLoginStatus({ current: null });
	return null;
};

beforeEach(async () => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.syncHandler = undefined;
	mocks.reportLoginSyncMismatch.mockClear();
	queryClient = new QueryClient();
	root = createRoot(document.createElement("div"));
	await act(async () =>
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(TestHook),
			),
		),
	);
});

afterEach(() => {
	act(() => root.unmount());
	vi.unstubAllGlobals();
});

it("웹이 로그인됐다고 알리면 다시 가져온 뒤 로그인 불일치를 확인한다", async () => {
	await act(async () => mocks.syncHandler?.({ isLoggedIn: true }));

	expect(mocks.reportLoginSyncMismatch).toHaveBeenCalledWith(queryClient);
});

it.each([
	["로그아웃 신호", { isLoggedIn: false }],
	["payload 없는 구버전 웹 신호", undefined],
])("%s에는 로그인 불일치를 확인하지 않는다", async (_, payload) => {
	await act(async () => mocks.syncHandler?.(payload));

	expect(mocks.reportLoginSyncMismatch).not.toHaveBeenCalled();
});

it("패널 로그인 창에서 로그인을 마치면 로그인 불일치를 확인한다", async () => {
	await act(async () => {
		window.dispatchEvent(new Event(PANEL_LOGIN_EVENT));
	});

	await vi.waitFor(() =>
		expect(mocks.reportLoginSyncMismatch).toHaveBeenCalledOnce(),
	);
});

it("네트워크가 돌아온 신호에는 로그인 불일치를 확인하지 않는다", async () => {
	await act(async () => {
		window.dispatchEvent(new Event("online"));
	});

	expect(mocks.reportLoginSyncMismatch).not.toHaveBeenCalled();
});
