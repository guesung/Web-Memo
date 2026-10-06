// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiFeaturesOption from "./AiFeaturesOption";

const mocks = vi.hoisted(() => ({
	save: vi.fn(),
	track: vi.fn(),
	setting: {
		showSummary: false,
		showAiChat: false,
		data: { error: null as Error | null },
	},
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useSettingQuery: () => mocks.setting,
}));
vi.mock("./useSaveSetting", () => ({ useSaveSetting: () => mocks.save }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.track },
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
		CardDescription: Container,
		CardContent: Container,
		Button: (props: { children: ReactNode; onClick: () => void }) =>
			createElement(
				"button",
				{ type: "button", onClick: props.onClick },
				props.children,
			),
		Label: (props: { children: ReactNode; htmlFor: string }) =>
			createElement("label", { htmlFor: props.htmlFor }, props.children),
		Switch: (props: {
			id: string;
			checked: boolean;
			disabled: boolean;
			onCheckedChange: (checked: boolean) => void;
		}) =>
			createElement("button", {
				id: props.id,
				role: "switch",
				"aria-checked": props.checked,
				type: "button",
				disabled: props.disabled,
				onClick: () => props.onCheckedChange(!props.checked),
			}),
	};
});

let root: Root;
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	mocks.setting = {
		showSummary: false,
		showAiChat: false,
		data: { error: null },
	};
	mocks.save.mockResolvedValue(undefined);
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});
const mount = async () => {
	await act(async () => root.render(createElement(AiFeaturesOption)));
};
const getSwitch = (id: string) =>
	document.getElementById(id) as HTMLButtonElement;

describe("AI 기능 옵션", () => {
	it("기본은 두 스위치 모두 꺼져 있다", async () => {
		await mount();

		expect(getSwitch("summary-enabled").getAttribute("aria-checked")).toBe(
			"false",
		);
		expect(getSwitch("ai-chat-enabled").getAttribute("aria-checked")).toBe(
			"false",
		);
	});

	it("요약 스위치를 켜면 show_summary만 저장하고 이벤트를 남긴다", async () => {
		await mount();
		await act(async () => getSwitch("summary-enabled").click());

		expect(mocks.save).toHaveBeenCalledTimes(1);
		expect(mocks.save).toHaveBeenCalledWith({ show_summary: true });
		expect(mocks.track).toHaveBeenCalledWith({
			name: "extension_setting_change",
			params: { keys: "show_summary", enabled: true },
		});
		expect(getSwitch("summary-enabled").getAttribute("aria-checked")).toBe(
			"true",
		);
		expect(getSwitch("ai-chat-enabled").getAttribute("aria-checked")).toBe(
			"false",
		);
	});

	it("채팅 스위치를 켜면 show_ai_chat을 저장한다", async () => {
		await mount();
		await act(async () => getSwitch("ai-chat-enabled").click());

		expect(mocks.save).toHaveBeenCalledWith({ show_ai_chat: true });
		expect(mocks.track).toHaveBeenCalledWith({
			name: "extension_setting_change",
			params: { keys: "show_ai_chat", enabled: true },
		});
	});

	it("저장에 실패하면 스위치를 이전 값으로 되돌리고 이벤트를 남기지 않는다", async () => {
		mocks.save.mockRejectedValue(new Error("failed"));
		await mount();
		await act(async () => getSwitch("summary-enabled").click());

		expect(getSwitch("summary-enabled").getAttribute("aria-checked")).toBe(
			"false",
		);
		expect(mocks.track).not.toHaveBeenCalled();
	});

	it("서버에 저장된 켜짐 값을 스위치에 반영한다", async () => {
		mocks.setting.showAiChat = true;
		await mount();

		expect(getSwitch("ai-chat-enabled").getAttribute("aria-checked")).toBe(
			"true",
		);
	});
});
