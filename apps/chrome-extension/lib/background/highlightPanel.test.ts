import type { TCreateHighlightResponse } from "@web-memo/shared/modules/extension-bridge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleFocusHighlight, notifyHighlightChange } from "./highlightPanel";

const mocks = vi.hoisted(() => ({
	notify: vi.fn(),
	getTab: vi.fn(),
	send: vi.fn(),
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { request: { HIGHLIGHTS_CHANGED: mocks.notify } },
}));
vi.mock("@web-memo/shared/utils", async () => {
	const { getPageKey } = await import(
		"../../../../packages/shared/src/utils/Url"
	);
	return { getPageKey };
});
const pageKey = "https://example.com/article";
const sender = { id: "extension-id" };
const payload = { tabId: 12, pageKey, id: 4 };
const result = {
	success: true,
	highlight: { id: 4, url: `${pageKey}?utm_source=email`, page_key: pageKey },
} as TCreateHighlightResponse;

beforeEach(() => {
	vi.resetAllMocks();
	mocks.notify.mockResolvedValue(undefined);
	mocks.getTab.mockResolvedValue({ id: 12, active: true, url: pageKey });
	mocks.send.mockResolvedValue({ success: true });
	vi.stubGlobal("chrome", {
		runtime: { id: "extension-id" },
		tabs: { get: mocks.getTab, sendMessage: mocks.send },
	});
});
afterEach(() => vi.unstubAllGlobals());

describe("패널 하이라이트 갱신", () => {
	it("저장된 행의 페이지 키만 알린다", async () => {
		await notifyHighlightChange(result);
		expect(mocks.notify).toHaveBeenCalledWith({ pageKey });
	});
	it("실패한 저장은 알리지 않는다", async () => {
		await notifyHighlightChange({ success: false, error: "save_failed" });
		expect(mocks.notify).not.toHaveBeenCalled();
	});
	it("패널이 닫혀 알림이 실패해도 저장 성공을 유지한다", async () => {
		mocks.notify.mockRejectedValue(new Error("no receiving end"));
		await expect(notifyHighlightChange(result)).resolves.toBeUndefined();
		expect(result.success).toBe(true);
	});
});

describe("원문 이동 대상 고정", () => {
	it("클릭한 탭과 페이지를 검증하고 해당 탭에 전달한다", async () => {
		expect(await handleFocusHighlight(payload, sender)).toEqual({
			success: true,
		});
		expect(mocks.getTab).toHaveBeenCalledWith(12);
		expect(mocks.send).toHaveBeenCalledWith(12, {
			type: "SCROLL_TO_HIGHLIGHT",
			payload: { pageKey, id: 4 },
		});
	});
	it.each([
		{ active: false, url: pageKey },
		{ active: true, url: "https://example.com/other" },
		{ active: true, url: undefined },
	])("탭 또는 페이지가 바뀌면 원문에 요청하지 않는다: %j", async (tab) => {
		mocks.getTab.mockResolvedValue(tab);
		expect(await handleFocusHighlight(payload, sender)).toEqual({
			success: false,
		});
		expect(mocks.send).not.toHaveBeenCalled();
	});
	it.each([
		{ ...payload, id: 0 },
		{ ...payload, tabId: -1 },
		{ ...payload, id: 1.2 },
	])("잘못된 식별자는 조회하지 않는다: %j", async (request) => {
		expect(await handleFocusHighlight(request, sender)).toEqual({
			success: false,
		});
		expect(mocks.getTab).not.toHaveBeenCalled();
	});
	it("다른 확장의 요청을 거부한다", async () => {
		expect(await handleFocusHighlight(payload, { id: "other" })).toEqual({
			success: false,
		});
		expect(mocks.getTab).not.toHaveBeenCalled();
	});
	it("문장을 못 찾거나 content script가 없으면 실패로 반환한다", async () => {
		mocks.send.mockResolvedValue({ success: false });
		expect(await handleFocusHighlight(payload, sender)).toEqual({
			success: false,
		});
		mocks.send.mockRejectedValue(new Error("page closed"));
		expect(await handleFocusHighlight(payload, sender)).toEqual({
			success: false,
		});
	});
});
