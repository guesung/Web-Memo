// @vitest-environment jsdom
import { analytics } from "@web-memo/shared/modules/analytics";
import { Identity, Tab } from "@web-memo/shared/utils/extension";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useLoginEntry, { type TLoginProvider } from "./useLoginEntry";

vi.mock("@web-memo/env", () => ({ CONFIG: { webUrl: "https://example.com" } }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn(), getExtensionClientId: vi.fn() },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	Tab: { create: vi.fn() },
	Identity: { canLaunchWebAuthFlow: vi.fn(), launchWebAuthFlow: vi.fn() },
}));

const EXTENSION_URL = "https://ext.chromiumapp.org/";

let root: Root;
let container: HTMLDivElement;
let entry: ReturnType<typeof useLoginEntry>;

function Probe() {
	entry = useLoginEntry();
	return null;
}

const openLogin = async (provider: TLoginProvider) => {
	await act(async () => {
		await entry.openLogin(provider);
	});
};

beforeEach(() => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement("div");
	root = createRoot(container);
	act(() => root.render(createElement(Probe)));
	vi.clearAllMocks();
	vi.mocked(analytics.getExtensionClientId).mockResolvedValue("cid-1");
	vi.mocked(Identity.canLaunchWebAuthFlow).mockReturnValue(true);
	vi.mocked(Identity.launchWebAuthFlow).mockResolvedValue(null);
});

afterEach(() => {
	act(() => root.unmount());
});

it.each(["kakao", "google"] as const)(
	"%s는 그 제공자의 로그인 시작 경로를 로그인 창으로 열고 클릭을 기록한다",
	async (provider) => {
		await openLogin(provider);

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

it("client_id를 알 수 없으면 ext_cid 없이 연다", async () => {
	vi.mocked(analytics.getExtensionClientId).mockResolvedValue(undefined);

	await openLogin("kakao");

	expect(Identity.launchWebAuthFlow).toHaveBeenCalledWith(
		"https://example.com/auth/start?provider=kakao&return=extension",
	);
});

it("로그인 창이 떠 있는 동안 누른 제공자를 진행 중으로 표시한다", async () => {
	vi.mocked(Identity.launchWebAuthFlow).mockReturnValue(new Promise(() => {}));

	await act(async () => {
		void entry.openLogin("google");
	});

	expect(entry.pendingProvider).toBe("google");
});

it("로그인에 성공하면 login·sign_up을 기록하고 패널에 로그인 신호를 보낸다", async () => {
	vi.mocked(Identity.launchWebAuthFlow).mockResolvedValue(
		`${EXTENSION_URL}?login=google&signup=true`,
	);
	const handlePanelLogin = vi.fn();
	window.addEventListener("web-memo:panel-login", handlePanelLogin);

	await openLogin("google");
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
	expect(entry.hasLoginError).toBe(false);
	expect(entry.pendingProvider).toBeNull();
});

it("기존 계정으로 로그인하면 sign_up 없이 login만 기록한다", async () => {
	vi.mocked(Identity.launchWebAuthFlow).mockResolvedValue(
		`${EXTENSION_URL}?login=kakao`,
	);

	await openLogin("kakao");

	expect(analytics.trackEvent).not.toHaveBeenCalledWith(
		expect.objectContaining({ name: "sign_up" }),
	);
	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "login",
		params: { method: "kakao" },
	});
});

it("사용자가 로그인 창을 닫으면 오류 없이 원래대로 돌아간다", async () => {
	await openLogin("kakao");

	expect(entry.pendingProvider).toBeNull();
	expect(entry.hasLoginError).toBe(false);
	expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
});

it.each([
	["웹이 오류를 돌려주면", () => Promise.resolve(`${EXTENSION_URL}?error=1`)],
	["로그인 창을 띄우지 못하면", () => Promise.reject(new Error("load failed"))],
])("%s 오류 상태를 켜고, 다시 시도하면 지운다", async (_, launch) => {
	vi.mocked(Identity.launchWebAuthFlow).mockImplementationOnce(launch);

	await openLogin("google");
	expect(entry.hasLoginError).toBe(true);
	expect(entry.pendingProvider).toBeNull();

	await openLogin("google");
	expect(entry.hasLoginError).toBe(false);
});

it("로그인 창을 쓸 수 없는 브라우저에서는 같은 경로를 새 탭으로 연다", async () => {
	vi.mocked(Identity.canLaunchWebAuthFlow).mockReturnValue(false);

	await openLogin("kakao");

	expect(Tab.create).toHaveBeenCalledWith({
		url: "https://example.com/auth/start?provider=kakao&ext_cid=cid-1",
	});
	expect(Identity.launchWebAuthFlow).not.toHaveBeenCalled();
});
