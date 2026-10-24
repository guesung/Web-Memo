// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useNoticeBanner from "./useNoticeBanner";

const mocks = vi.hoisted(() => ({
	notice: undefined as { id: number } | undefined,
	getDismissed: vi.fn(),
	subscribe: vi.fn(() => vi.fn()),
	trackEvent: vi.fn(),
	recordExposure: vi.fn(),
	reportError: vi.fn(),
}));

vi.mock("@web-memo/shared/hooks", () => ({
	useNoticeQuery: () => ({ data: mocks.notice }),
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: mocks.getDismissed, subscribe: mocks.subscribe },
	STORAGE_KEYS: { dismissedNoticeIds: "dismissedNoticeIds" },
	recordFirstNoticeExposure: mocks.recordExposure,
}));
vi.mock("../../utils", () => ({ reportSidePanelError: mocks.reportError }));

let root: Root;
let visibleNotice: ReturnType<typeof useNoticeBanner>["notice"];

function TestHook() {
	visibleNotice = useNoticeBanner().notice;
	return null;
}

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.clearAllMocks();
	mocks.notice = undefined;
	mocks.getDismissed.mockResolvedValue([]);
	mocks.recordExposure.mockResolvedValue(undefined);
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("실제로 표시한 공지만 첫 노출로 저장하고 notice_view는 한 번 보낸다", async () => {
	await act(async () => root.render(createElement(TestHook)));
	expect(mocks.recordExposure).not.toHaveBeenCalled();

	mocks.notice = { id: 42 };
	await act(async () => root.render(createElement(TestHook)));
	expect(visibleNotice?.id).toBe(42);
	expect(mocks.recordExposure).toHaveBeenCalledOnce();
	expect(mocks.recordExposure).toHaveBeenCalledWith({ noticeId: 42 });
	expect(mocks.trackEvent).toHaveBeenCalledOnce();
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "notice_view",
		params: { notice_id: 42 },
	});

	await act(async () => root.render(createElement(TestHook)));
	expect(mocks.recordExposure).toHaveBeenCalledTimes(1);
});

it("닫은 공지는 첫 노출로 저장하지 않는다", async () => {
	mocks.notice = { id: 42 };
	mocks.getDismissed.mockResolvedValue([42]);
	await act(async () => root.render(createElement(TestHook)));
	expect(visibleNotice).toBeNull();
	expect(mocks.recordExposure).not.toHaveBeenCalled();
});

it("첫 노출 저장 실패를 보고해도 notice_view를 유지한다", async () => {
	const error = new Error("storage unavailable");
	mocks.notice = { id: 42 };
	mocks.recordExposure.mockRejectedValue(error);
	await act(async () => root.render(createElement(TestHook)));
	expect(mocks.reportError).toHaveBeenCalledWith({
		error,
		feature: "notice",
		operation: "record_exposure",
		stage: "storage",
		level: "warning",
	});
	expect(mocks.trackEvent).toHaveBeenCalledOnce();
	expect(mocks.trackEvent).toHaveBeenCalledWith({
		name: "notice_view",
		params: { notice_id: 42 },
	});
});
