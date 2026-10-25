// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, Component, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsUserTracking } from "./AnalyticsUserTracking";

const mocks = vi.hoisted(() => ({
	getClient: vi.fn(),
	getUser: vi.fn(),
	setUserId: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { buildEnv: "development", webUrl: "http://localhost:3000" },
}));
vi.mock("../../hooks/supabase/queries/useSupabaseClientQuery", () => ({
	supabaseClientQueryOptions: () => ({
		queryKey: ["supabaseClient"],
		queryFn: mocks.getClient,
		retry: false,
	}),
}));
vi.mock("../../hooks/supabase/queries/useSupabaseUserQuery", () => ({
	userQueryOptions: (supabaseClient: unknown) => ({
		queryKey: ["user"],
		queryFn: () => mocks.getUser(supabaseClient),
		retry: false,
	}),
}));
vi.mock("./Analytics", () => ({
	analytics: { setUserId: mocks.setUserId },
}));

/** 자식이 던진 오류를 기록하고, 오류가 나면 표식을 그리는 테스트용 경계. */
class CaptureBoundary extends Component<
	{ children: ReactNode; onError: (error: Error) => void },
	{ error: Error | null }
> {
	state = { error: null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error) {
		this.props.onError(error);
	}

	render() {
		return this.state.error ? "fallback" : this.props.children;
	}
}

let root: Root;
let container: HTMLElement;
let caughtErrors: Error[];

const renderTracking = async () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	await act(async () =>
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(
					CaptureBoundary,
					{ onError: (error: Error) => caughtErrors.push(error) },
					createElement(AnalyticsUserTracking),
				),
			),
		),
	);
	// 쿼리 함수의 Promise와 그 뒤의 리렌더·effect를 모두 흘려보낸다.
	for (let i = 0; i < 3; i++) {
		await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
	}
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	caughtErrors = [];
	document.body.innerHTML = '<div id="root"></div>';
	container = document.getElementById("root") as HTMLElement;
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("AnalyticsUserTracking", () => {
	it("로그아웃이면 오류를 던지지 않고 아무것도 그리지 않으며 사용자 id를 비운다", async () => {
		mocks.getClient.mockRejectedValue(new Error("로그인을 먼저 해주세요"));

		await renderTracking();

		expect(caughtErrors).toEqual([]);
		expect(container.innerHTML).toBe("");
		expect(mocks.getUser).not.toHaveBeenCalled();
		expect(mocks.setUserId).toHaveBeenCalledOnce();
		expect(mocks.setUserId).toHaveBeenCalledWith(undefined);
	});

	it("로그인 상태면 사용자 id를 analytics에 알린다", async () => {
		const supabaseClient = { name: "client" };
		mocks.getClient.mockResolvedValue(supabaseClient);
		mocks.getUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});

		await renderTracking();

		expect(caughtErrors).toEqual([]);
		expect(container.innerHTML).toBe("");
		expect(mocks.getUser).toHaveBeenCalledWith(supabaseClient);
		expect(mocks.setUserId).toHaveBeenCalledOnce();
		expect(mocks.setUserId).toHaveBeenCalledWith("user-1");
	});

	it("사용자 조회가 끝나기 전에는 사용자 id를 건드리지 않는다", async () => {
		mocks.getClient.mockResolvedValue({ name: "client" });
		mocks.getUser.mockReturnValue(new Promise(() => {}));

		await renderTracking();

		expect(mocks.setUserId).not.toHaveBeenCalled();
	});

	it("로그아웃이 아닌 오류는 지금처럼 ErrorBoundary로 던진다", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const error = new Error("Failed to fetch");
		mocks.getClient.mockRejectedValue(error);

		await renderTracking();

		expect(caughtErrors).toEqual([error]);
		expect(mocks.setUserId).not.toHaveBeenCalled();
	});
});
