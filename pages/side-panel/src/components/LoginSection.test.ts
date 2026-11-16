// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Identity, Tab } from "@web-memo/shared/utils/extension";
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
	Identity: { canLaunchWebAuthFlow: vi.fn(), launchWebAuthFlow: vi.fn() },
}));

const EXTENSION_URL = "https://ext.chromiumapp.org/";

const clickButton = async (label: string) => {
	await act(async () => {
		[...container.querySelectorAll("button")]
			.find((button) => button.textContent === label)
			?.click();
	});
};

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
	vi.clearAllMocks();
	vi.mocked(Identity.canLaunchWebAuthFlow).mockReturnValue(true);
	vi.mocked(Identity.launchWebAuthFlow).mockResolvedValue(null);
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

	expect(container.textContent).toContain("login_google_button");
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

	expect(container.textContent).toContain("login_google_button");
});

it("로그인 전에 예시와 할 수 있는 일을 보여주고, 카카오·Google 버튼만 내놓는다", async () => {
	queryClient.setQueryData(QUERY_KEY.user(), {
		data: { user: null },
		error: null,
	});

	await renderLoginSection();

	expect(container.querySelector("mark")?.textContent).toBe(
		"login_example_quote_highlight",
	);
	expect(container.querySelectorAll("li")).toHaveLength(3);
	expect(
		[...container.querySelectorAll("button")].map(
			(button) => button.textContent,
		),
	).toEqual(["login_kakao_button", "login_google_button"]);
});

const renderLoggedOut = async () => {
	queryClient.setQueryData(QUERY_KEY.user(), {
		data: { user: null },
		error: null,
	});
	vi.mocked(analytics.getExtensionClientId).mockResolvedValue("cid-1");
	await renderLoginSection();
};

it.each([
	["login_kakao_button", "kakao"],
	["login_google_button", "google"],
])(
	"%s 버튼은 그 제공자의 로그인 시작 경로를 로그인 창으로 연다",
	async (label, provider) => {
		await renderLoggedOut();

		await clickButton(label);

		expect(analytics.trackEvent).toHaveBeenCalledWith({
			name: "side_panel_login_click",
			params: { method: provider },
		});
		expect(Identity.launchWebAuthFlow).toHaveBeenCalledWith(
			`https://example.com/auth/start?provider=${provider}&ext_cid=cid-1&return=extension`,
		);
		expect(Tab.create).not.toHaveBeenCalled();
	},
);

it("로그인 창이 떠 있는 동안 누른 버튼은 진행 중 문구로 바뀌고 모든 버튼이 잠긴다", async () => {
	vi.mocked(Identity.launchWebAuthFlow).mockReturnValue(new Promise(() => {}));
	await renderLoggedOut();

	await clickButton("login_google_button");

	const buttons = [...container.querySelectorAll("button")];
	expect(buttons.map((button) => button.textContent)).toEqual([
		"login_kakao_button",
		"login_google_pending",
	]);
	expect(buttons.every((button) => button.disabled)).toBe(true);
});

it("로그인에 성공하면 login·sign_up을 기록하고 패널에 로그인 신호를 보낸다", async () => {
	vi.mocked(Identity.launchWebAuthFlow).mockResolvedValue(
		`${EXTENSION_URL}?login=google&signup=true`,
	);
	const handlePanelLogin = vi.fn();
	window.addEventListener("web-memo:panel-login", handlePanelLogin);
	await renderLoggedOut();

	await clickButton("login_google_button");
	window.removeEventListener("web-memo:panel-login", handlePanelLogin);

	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "sign_up",
		params: { method: "google" },
	});
	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "login",
		params: { method: "google" },
	});
	expect(handlePanelLogin).toHaveBeenCalledTimes(1);
	expect(container.textContent).not.toContain("login_failed");
});

it("사용자가 로그인 창을 닫으면 오류 없이 원래대로 돌아간다", async () => {
	await renderLoggedOut();

	await clickButton("login_kakao_button");

	const buttons = [...container.querySelectorAll("button")];
	expect(buttons.some((button) => button.disabled)).toBe(false);
	expect(container.textContent).not.toContain("login_failed");
	expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
});

it.each([
	["웹이 오류를 돌려주면", () => Promise.resolve(`${EXTENSION_URL}?error=1`)],
	["로그인 창을 띄우지 못하면", () => Promise.reject(new Error("load failed"))],
])("%s 실패 안내를 보여주고, 다시 누르면 지운다", async (_, launch) => {
	vi.mocked(Identity.launchWebAuthFlow).mockImplementationOnce(launch);
	await renderLoggedOut();

	await clickButton("login_google_button");
	expect(container.querySelector('[role="alert"]')?.textContent).toBe(
		"login_failed",
	);

	await clickButton("login_google_button");
	expect(container.querySelector('[role="alert"]')).toBeNull();
});

it("로그인 창을 쓸 수 없는 브라우저에서는 같은 경로를 새 탭으로 연다", async () => {
	vi.mocked(Identity.canLaunchWebAuthFlow).mockReturnValue(false);
	await renderLoggedOut();

	await clickButton("login_kakao_button");

	expect(Tab.create).toHaveBeenCalledWith({
		url: "https://example.com/auth/start?provider=kakao&ext_cid=cid-1",
	});
	expect(Identity.launchWebAuthFlow).not.toHaveBeenCalled();
});
