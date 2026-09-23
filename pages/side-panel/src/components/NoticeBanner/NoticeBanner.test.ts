// @vitest-environment jsdom
import { act, createElement, type HTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NoticeBanner from "./index";

const mocks = vi.hoisted(() => ({
	dismiss: vi.fn(),
	options: vi.fn(),
	visible: true,
}));
vi.mock("./useNoticeBanner", () => ({
	default: () => ({
		notice: mocks.visible ? { id: 1 } : null,
		handleNoticeDismiss: mocks.dismiss,
	}),
}));
vi.mock("./getNoticeContent", () => ({
	getNoticeContent: () => ({
		title: "하이라이트 안내",
		body: "색상을 골라 문장을 저장해요.",
		link: { label: "설정 열기", target: { type: "options" } },
	}),
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key, getUILanguage: () => "ko" },
	Tab: { create: vi.fn() },
}));
vi.mock("@web-memo/ui", () => ({
	Alert: (props: HTMLAttributes<HTMLDivElement>) =>
		createElement("div", { ...props, role: "alert" }),
	AlertTitle: (props: HTMLAttributes<HTMLHeadingElement>) =>
		createElement("h2", props),
	AlertDescription: (props: HTMLAttributes<HTMLDivElement>) =>
		createElement("div", props),
	Button: (props: HTMLAttributes<HTMLButtonElement>) =>
		createElement("button", { type: "button", ...props }),
}));
let root: Root;
beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal("chrome", { runtime: { openOptionsPage: mocks.options } });
	vi.clearAllMocks();
	mocks.visible = true;
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});
describe("사이드 패널 중앙 공지", () => {
	it("메모 영역 밖의 portal에 뷰포트 중앙과 작은 화면 제한 스타일로 렌더링한다", async () => {
		await act(async () => root.render(createElement(NoticeBanner)));
		const notice = document.querySelector('[role="alert"]');
		expect(notice?.parentElement).toBe(document.body);
		expect(notice?.className).toContain("fixed left-1/2 top-1/2");
		expect(notice?.className).toContain("-translate-x-1/2 -translate-y-1/2");
		expect(notice?.className).toContain("max-h-[calc(100dvh-2rem)]");
		expect(notice?.className).toContain("overflow-y-auto");
	});
	it("공지 닫기와 설정 열기 동작을 유지한다", async () => {
		await act(async () => root.render(createElement(NoticeBanner)));
		await act(async () =>
			(
				document.querySelector(
					'[aria-label="notice_dismiss_label"]',
				) as HTMLButtonElement
			).click(),
		);
		expect(mocks.dismiss).toHaveBeenCalledOnce();
		const settings = Array.from(document.querySelectorAll("button")).find(
			(button) => button.textContent === "설정 열기",
		);
		await act(async () => settings?.click());
		expect(mocks.options).toHaveBeenCalledOnce();
	});
	it("표시할 공지가 없으면 portal을 만들지 않는다", async () => {
		mocks.visible = false;
		await act(async () => root.render(createElement(NoticeBanner)));
		expect(document.querySelector('[role="alert"]')).toBeNull();
	});
});
