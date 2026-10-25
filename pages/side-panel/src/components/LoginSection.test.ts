// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LoginSection from "./LoginSection";

vi.mock("@web-memo/env", () => ({ CONFIG: { webUrl: "https://example.com" } }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn(), getExtensionClientId: vi.fn() },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
	Tab: { create: vi.fn() },
}));

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

const setOnLine = (isOnline: boolean) => {
	Object.defineProperty(navigator, "onLine", {
		configurable: true,
		get: () => isOnline,
	});
};

const renderLoginSection = async () => {
	await act(async () => {
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(LoginSection),
			),
		);
	});
};

beforeEach(() => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	queryClient = new QueryClient();
	setOnLine(true);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

it("온라인이고 사용자 확인이 네트워크 오류가 아니면 로그인 버튼을 보여준다", async () => {
	queryClient.setQueryData(QUERY_KEY.user(), {
		data: { user: null },
		error: null,
	});

	await renderLoginSection();

	expect(container.textContent).toContain("로그인하러가기");
	expect(container.textContent).not.toContain("login_network_unavailable");
});

it("브라우저가 오프라인이면 로그인 버튼 대신 연결 안내를 보여준다", async () => {
	setOnLine(false);

	await renderLoginSection();

	expect(container.textContent).toContain("login_network_unavailable");
	expect(container.querySelector("button")).toBeNull();
});

it("onLine이 true여도 사용자 확인이 네트워크 오류로 끝났으면 연결 안내를 보여준다", async () => {
	queryClient.setQueryData(QUERY_KEY.user(), {
		data: { user: null },
		error: { name: "AuthRetryableFetchError", message: "Failed to fetch" },
	});

	await renderLoginSection();

	expect(container.textContent).toContain("login_network_unavailable");
	expect(container.querySelector("button")).toBeNull();
});

it("연결 안내 중에 online 이벤트가 오면 다시 판단한다", async () => {
	setOnLine(false);
	await renderLoginSection();

	setOnLine(true);
	await act(async () => {
		window.dispatchEvent(new Event("online"));
	});

	expect(container.textContent).toContain("로그인하러가기");
});
