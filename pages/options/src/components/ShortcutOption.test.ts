// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShortcutOption from "./ShortcutOption";

const mocks = vi.hoisted(() => ({
	getActionShortcut: vi.fn(),
	tabCreate: vi.fn(),
	toast: vi.fn(),
	trackEvent: vi.fn(),
}));
vi.mock("@web-memo/shared/constants", () => ({
	QUERY_KEY: { shortcut: () => ["shortcut"] },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	Commands: { getActionShortcut: mocks.getActionShortcut },
	I18n: { get: (key: string) => key },
	Tab: { create: mocks.tabCreate },
}));
vi.mock("@web-memo/ui", () => {
	const Container = (props: { children: ReactNode }) =>
		createElement("div", null, props.children);

	return {
		Card: Container,
		CardHeader: Container,
		CardTitle: Container,
		CardContent: Container,
		Badge: (props: { children: ReactNode }) =>
			createElement(
				"span",
				{ "data-testid": "shortcut-badge" },
				props.children,
			),
		Skeleton: () =>
			createElement("span", { "data-testid": "shortcut-skeleton" }),
		Button: (props: { children: ReactNode; onClick: () => void }) =>
			createElement(
				"button",
				{ type: "button", onClick: props.onClick },
				props.children,
			),
		useToast: () => ({ toast: mocks.toast }),
	};
});

let root: Root;
let queryClient: QueryClient;
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});
const flushMicrotasks = () =>
	act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
const mount = async () => {
	await act(async () => {
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(ShortcutOption),
			),
		);
	});
	await flushMicrotasks();
};

describe("단축키 옵션", () => {
	it("조회한 단축키를 배지로 보여준다", async () => {
		mocks.getActionShortcut.mockResolvedValue("Alt+S");
		await mount();
		expect(
			document.querySelector('[data-testid="shortcut-badge"]')?.textContent,
		).toBe("Alt+S");
	});
	it("빈 값이면 지정된 단축키 없음을 보여준다", async () => {
		mocks.getActionShortcut.mockResolvedValue("");
		await mount();
		expect(document.body.textContent).toContain("shortcut_not_set");
		expect(document.querySelector('[data-testid="shortcut-badge"]')).toBeNull();
	});
	it("조회에 실패하면 읽기 실패 문구를 보여준다", async () => {
		mocks.getActionShortcut.mockRejectedValue(new Error("failed"));
		await mount();
		expect(document.body.textContent).toContain("shortcut_load_failed");
		expect(document.querySelector('[data-testid="shortcut-badge"]')).toBeNull();
	});
	it("이미 표시된 단축키를 다시 읽다가 실패하면 배지 대신 읽기 실패 문구를 보여준다", async () => {
		mocks.getActionShortcut.mockResolvedValueOnce("Alt+S");
		await mount();
		expect(
			document.querySelector('[data-testid="shortcut-badge"]')?.textContent,
		).toBe("Alt+S");
		mocks.getActionShortcut.mockRejectedValueOnce(new Error("failed"));
		await act(async () => {
			await queryClient.refetchQueries({ queryKey: ["shortcut"] });
		});
		await flushMicrotasks();
		expect(document.body.textContent).toContain("shortcut_load_failed");
		expect(document.querySelector('[data-testid="shortcut-badge"]')).toBeNull();
	});
	it("버튼을 누르면 단축키 설정 페이지 탭을 연다", async () => {
		mocks.getActionShortcut.mockResolvedValue("Alt+S");
		mocks.tabCreate.mockResolvedValue(undefined);
		await mount();
		await act(async () =>
			(document.querySelector("button") as HTMLButtonElement).click(),
		);
		expect(mocks.tabCreate).toHaveBeenCalledWith({
			url: "chrome://extensions/shortcuts",
		});
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "shortcut_change_click",
			params: { is_success: true },
		});
	});
	it("탭을 열지 못하면 오류를 알리고 실패 이벤트를 기록한다", async () => {
		mocks.getActionShortcut.mockResolvedValue("Alt+S");
		mocks.tabCreate.mockRejectedValue(new Error("failed"));
		await mount();
		await act(async () =>
			(document.querySelector("button") as HTMLButtonElement).click(),
		);
		expect(mocks.toast).toHaveBeenCalledWith({
			title: "shortcut_open_settings_failed",
		});
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "shortcut_change_click",
			params: { is_success: false },
		});
	});
});
