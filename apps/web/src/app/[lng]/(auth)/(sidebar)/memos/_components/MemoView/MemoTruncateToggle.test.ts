// @vitest-environment jsdom
import { act, type ButtonHTMLAttributes, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemoTruncateToggle from "./MemoTruncateToggle";

const mocks = vi.hoisted(() => ({
	settings: vi.fn(),
	upsert: vi.fn(),
	holdScrollPosition: vi.fn(),
	refetch: vi.fn(),
	isPending: false,
}));
vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useSettingUpsertMutation: () => ({
		mutate: mocks.upsert,
		isPending: mocks.isPending,
	}),
}));
vi.mock("@web-memo/ui", async () => {
	const { createElement } = await import("react");
	return {
		Button: ({
			children,
			size: _size,
			variant: _variant,
			...props
		}: ButtonHTMLAttributes<HTMLButtonElement> & {
			size?: string;
			variant?: string;
		}) => createElement("button", props, children),
	};
});
vi.mock("./_hooks/useMemoSettings", () => ({
	useMemoSettings: mocks.settings,
}));
vi.mock("./scrollPositionHold", () => ({
	holdScrollPosition: mocks.holdScrollPosition,
}));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("메모 내용 줄이기 버튼", () => {
	it("cold loading과 실패 중에는 저장을 막고 실패 시 재시도한다", async () => {
		mocks.settings.mockReturnValue({
			truncateMemoContent: true,
			isSettingReady: false,
			isSettingError: false,
			refetchSetting: mocks.refetch,
		});
		const { container, rerender, unmount } = await renderToggle();
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-label="memos.view.truncateContent"]',
		);
		expect(toggle?.disabled).toBe(true);
		expect(container.querySelector('[role="alert"]')).toBeNull();

		mocks.settings.mockReturnValue({
			truncateMemoContent: true,
			isSettingReady: false,
			isSettingError: true,
			refetchSetting: mocks.refetch,
		});
		await rerender();
		expect(toggle?.disabled).toBe(true);
		expect(container.querySelector('[role="alert"]')?.textContent).toContain(
			"error.500.title",
		);
		const retry = Array.from(container.querySelectorAll("button")).find(
			(button) => button.textContent === "error.500.retry",
		);
		await act(async () => retry?.click());
		expect(mocks.refetch).toHaveBeenCalledTimes(1);
		expect(mocks.upsert).not.toHaveBeenCalled();
		await unmount();
	});

	it("설정 조회 성공 후에만 현재 값의 반대를 저장한다", async () => {
		mocks.settings.mockReturnValue({
			truncateMemoContent: false,
			isSettingReady: true,
			isSettingError: false,
			refetchSetting: mocks.refetch,
		});
		const { container, unmount } = await renderToggle();
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-label="memos.view.truncateContent"]',
		);
		expect(toggle?.disabled).toBe(false);
		expect(toggle?.getAttribute("aria-pressed")).toBe("false");
		await act(async () => toggle?.click());
		expect(mocks.holdScrollPosition).toHaveBeenCalledTimes(1);
		expect(mocks.upsert).toHaveBeenCalledWith({
			truncate_memo_content: true,
		});
		await unmount();
	});
});

async function renderToggle() {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	const container = document.createElement("div");
	const root = createRoot(container);
	async function rerender() {
		await act(async () =>
			root.render(createElement(MemoTruncateToggle, { lng: "ko" })),
		);
	}
	await rerender();
	return {
		container,
		rerender,
		unmount: async () => act(async () => root.unmount()),
	};
}
