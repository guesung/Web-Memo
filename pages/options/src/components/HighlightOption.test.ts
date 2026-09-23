// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HighlightOption from "./HighlightOption";

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	set: vi.fn(),
	toast: vi.fn(),
	track: vi.fn(),
	listeners: new Map<string, (value: unknown) => void>(),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.track },
}));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: {
		get: mocks.get,
		set: mocks.set,
		subscribe: (key: string, callback: (value: unknown) => void) => {
			mocks.listeners.set(key, callback);
			return () => mocks.listeners.delete(key);
		},
	},
	STORAGE_KEYS: {
		highlightBubbleEnabled: "enabled",
		highlightBubblePosition: "position",
		highlightDisabledSites: "sites",
	},
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));
vi.mock("@web-memo/ui", () => {
	const Container = (props: { children: ReactNode }) =>
		createElement("div", null, props.children);

	return {
		Card: Container,
		CardHeader: Container,
		CardTitle: Container,
		CardContent: Container,
		Label: (props: { children: ReactNode; htmlFor: string }) =>
			createElement("label", { htmlFor: props.htmlFor }, props.children),
		Button: (props: {
			children: ReactNode;
			disabled: boolean;
			onClick: () => void;
			"aria-label": string;
		}) =>
			createElement(
				"button",
				{
					type: "button",
					disabled: props.disabled,
					onClick: props.onClick,
					"aria-label": props["aria-label"],
				},
				props.children,
			),
		Switch: (props: {
			checked: boolean;
			disabled: boolean;
			onCheckedChange: (checked: boolean) => void;
		}) =>
			createElement("button", {
				role: "switch",
				"aria-checked": props.checked,
				type: "button",
				disabled: props.disabled,
				onClick: () => props.onCheckedChange(!props.checked),
			}),
		useToast: () => ({ toast: mocks.toast }),
	};
});
let root: Root;
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	mocks.listeners.clear();
	mocks.get.mockImplementation(
		async (key: string) =>
			({
				enabled: true,
				position: "below",
				sites: ["example.com", "other.com"],
			})[key],
	);
	mocks.set.mockResolvedValue(undefined);
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});
const mount = async () => {
	await act(async () => root.render(createElement(HighlightOption)));
};

describe("하이라이트 옵션", () => {
	it("위치를 즉시 저장하고 설정 이벤트를 기록한다", async () => {
		await mount();
		const select = document.querySelector("select") as HTMLSelectElement;
		await act(async () => {
			select.value = "above";
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
		expect(mocks.set).toHaveBeenCalledWith("position", "above");
		expect(select.value).toBe("above");
		expect(mocks.track).toHaveBeenCalledWith({
			name: "extension_setting_change",
			params: { keys: "position" },
		});
	});
	it("선택한 사이트만 다시 켜고 나머지 차단은 유지한다", async () => {
		await mount();
		await act(async () =>
			(
				document.querySelector(
					'[aria-label="example.com: highlight_site_enable"]',
				) as HTMLButtonElement
			).click(),
		);
		expect(mocks.set).toHaveBeenCalledWith("sites", ["other.com"]);
		expect(
			document.querySelector(
				'[aria-label="example.com: highlight_site_enable"]',
			),
		).toBeNull();
		expect(document.body.textContent).toContain("other.com");
	});
	it("실패하면 차단 목록을 유지하고 오류를 알린다", async () => {
		mocks.set.mockRejectedValue(new Error("failed"));
		await mount();
		await act(async () =>
			(
				document.querySelector(
					'[aria-label="example.com: highlight_site_enable"]',
				) as HTMLButtonElement
			).click(),
		);
		expect(document.body.textContent).toContain("example.com");
		expect(mocks.toast).toHaveBeenCalledWith({
			title: "highlight_bubble_setting_save_failed",
		});
	});
	it("다른 탭의 설정을 반영하고 해제된 키는 기본값으로 돌아간다", async () => {
		await mount();
		await act(async () => {
			mocks.listeners.get("position")?.("above");
			mocks.listeners.get("sites")?.([]);
		});
		expect((document.querySelector("select") as HTMLSelectElement).value).toBe(
			"above",
		);
		expect(document.body.textContent).toContain(
			"highlight_disabled_sites_empty",
		);
		await act(async () => mocks.listeners.get("position")?.(undefined));
		expect((document.querySelector("select") as HTMLSelectElement).value).toBe(
			"below",
		);
	});
	it("초기 조회 실패 시 저장 입력을 비활성화한다", async () => {
		mocks.get.mockRejectedValue(new Error("failed"));
		await mount();
		expect(
			(document.querySelector("select") as HTMLSelectElement).disabled,
		).toBe(true);
		expect(
			(document.querySelector('[role="switch"]') as HTMLButtonElement).disabled,
		).toBe(true);
	});
});
