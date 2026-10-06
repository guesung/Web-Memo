// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiFeaturesOption from "./AiFeaturesOption";

const mocks = vi.hoisted(() => ({
	set: vi.fn(),
	settings: { isLoaded: true, isSummaryEnabled: true, isChatEnabled: true },
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useAiFeatureSettings: () => mocks.settings,
}));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { set: mocks.set },
	STORAGE_KEYS: { summaryEnabled: "summary", aiChatEnabled: "chat" },
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
	mocks.settings = {
		isLoaded: true,
		isSummaryEnabled: true,
		isChatEnabled: true,
	};
	mocks.set.mockResolvedValue(undefined);
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
	it("요약 스위치를 끄면 summaryEnabled를 false로 저장하고 채팅은 건드리지 않는다", async () => {
		await mount();
		await act(async () => getSwitch("summary-enabled").click());

		expect(mocks.set).toHaveBeenCalledTimes(1);
		expect(mocks.set).toHaveBeenCalledWith("summary", false);
		expect(getSwitch("summary-enabled").getAttribute("aria-checked")).toBe(
			"false",
		);
		expect(getSwitch("ai-chat-enabled").getAttribute("aria-checked")).toBe(
			"true",
		);
	});

	it("채팅 스위치를 끄면 aiChatEnabled를 false로 저장한다", async () => {
		await mount();
		await act(async () => getSwitch("ai-chat-enabled").click());

		expect(mocks.set).toHaveBeenCalledWith("chat", false);
	});

	it("저장에 실패하면 스위치를 이전 값으로 되돌린다", async () => {
		mocks.set.mockRejectedValue(new Error("failed"));
		await mount();
		await act(async () => getSwitch("summary-enabled").click());

		expect(getSwitch("summary-enabled").getAttribute("aria-checked")).toBe(
			"true",
		);
	});

	it("저장소 값을 읽기 전에는 스위치를 잠근다", async () => {
		mocks.settings.isLoaded = false;
		await mount();

		expect(getSwitch("summary-enabled").disabled).toBe(true);
		expect(getSwitch("ai-chat-enabled").disabled).toBe(true);
	});

	it("저장된 꺼짐 값을 스위치에 반영한다", async () => {
		mocks.settings.isChatEnabled = false;
		await mount();

		expect(getSwitch("ai-chat-enabled").getAttribute("aria-checked")).toBe(
			"false",
		);
	});
});
