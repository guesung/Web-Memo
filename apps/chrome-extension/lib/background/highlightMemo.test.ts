import { SupabaseSessionRequiredError } from "@web-memo/shared/utils/extension";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	handleCreateHighlightMemo,
	handleGetHighlightMemoLinks,
} from "./highlightMemo";

const mocks = vi.hoisted(() => ({
	getClient: vi.fn(),
	getUser: vi.fn(),
	getHighlightById: vi.fn(),
	getHighlightsByUrl: vi.fn(),
	create: vi.fn(),
	getByHighlightIds: vi.fn(),
	report: vi.fn(),
	sendMessage: vi.fn(),
	createTab: vi.fn(),
	trackEvent: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "http://localhost:3001" },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/utils", async () => {
	const { getPageKey, normalizeUrl } = await import(
		"../../../../packages/shared/src/utils/Url"
	);
	return {
		getPageKey,
		normalizeUrl,
		HighlightService: class {
			getHighlightById = mocks.getHighlightById;
			getHighlightsByUrl = mocks.getHighlightsByUrl;
		},
		HighlightMemoService: class {
			create = mocks.create;
			getByHighlightIds = mocks.getByHighlightIds;
		},
	};
});
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: mocks.getClient,
	SupabaseSessionRequiredError: class extends Error {},
}));
vi.mock("./reportBackgroundError", () => ({
	reportBackgroundError: mocks.report,
}));

const PAGE_URL = "https://example.com/article";
const SENDER: chrome.runtime.MessageSender = {
	id: "extension-id",
	frameId: 0,
	url: PAGE_URL,
	tab: { id: 1, url: PAGE_URL } as chrome.tabs.Tab,
};

beforeEach(() => {
	vi.stubGlobal("chrome", {
		runtime: { id: "extension-id", sendMessage: mocks.sendMessage },
		tabs: { create: mocks.createTab },
	});
	mocks.getClient
		.mockReset()
		.mockResolvedValue({ auth: { getUser: mocks.getUser } });
	mocks.getUser.mockReset().mockResolvedValue({
		data: { user: { id: "owner" } },
		error: null,
	});
	mocks.getHighlightById.mockReset().mockResolvedValue({
		data: { id: 7, url: PAGE_URL },
		error: null,
	});
	mocks.getHighlightsByUrl.mockReset().mockResolvedValue({
		data: [
			{ id: 7, user_id: "owner" },
			{ id: 8, user_id: "different-user" },
		],
		error: null,
	});
	mocks.create.mockReset().mockResolvedValue({
		memo_id: 20,
		highlight_id: 7,
		created: true,
		deleted_at: null,
	});
	mocks.getByHighlightIds
		.mockReset()
		.mockResolvedValue([{ highlight_id: 7, memo_id: 20 }]);
	mocks.sendMessage.mockReset().mockResolvedValue(undefined);
	mocks.report.mockReset();
	mocks.createTab.mockReset().mockResolvedValue({ id: 22 });
	mocks.trackEvent.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("background 하이라이트 연결 메모 생성", () => {
	it("발신 페이지의 본인 하이라이트만 저장하고 메모 ID를 반환한다", async () => {
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				SENDER,
			),
		).toEqual({ success: true, memoId: 20, created: true, deletedAt: null });
		expect(mocks.getHighlightById).toHaveBeenCalledWith({
			id: 7,
			userId: "owner",
		});
		expect(mocks.create).toHaveBeenCalledWith(7, "내 생각");
		expect(mocks.createTab).toHaveBeenCalledWith({
			url: expect.stringContaining("/memos?id=20"),
		});
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "memo_open",
			params: { source: "highlight", has_search_query: false },
		});
		expect(mocks.sendMessage).toHaveBeenCalledWith({
			type: "REFETCH_THE_MEMO_LIST_FROM_EXTENSION",
		});
	});

	it("새 탭 실패는 이미 저장한 메모를 실패로 바꾸지 않는다", async () => {
		mocks.createTab.mockRejectedValueOnce(new Error("tab unavailable"));
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				SENDER,
			),
		).toMatchObject({ success: true, memoId: 20 });
		expect(mocks.trackEvent).not.toHaveBeenCalled();
	});
	it.each([
		{ highlightId: 0, memo: "내 생각" },
		{ highlightId: 7, memo: "  " },
	])("잘못된 작성 요청은 인증 전에 거절한다", async (payload) => {
		expect(await handleCreateHighlightMemo(payload, SENDER)).toEqual({
			success: false,
			reason: "invalid_request",
		});
		expect(mocks.getClient).not.toHaveBeenCalled();
	});

	it.each([
		{ ...SENDER, id: "other-extension" },
		{ ...SENDER, frameId: 1 },
		{ ...SENDER, tab: { ...SENDER.tab, url: "https://other.example/article" } },
	])("다른 발신 페이지에서는 메모를 만들지 않는다", async (sender) => {
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				sender as chrome.runtime.MessageSender,
			),
		).toEqual({ success: false, reason: "invalid_request" });
		expect(mocks.getClient).not.toHaveBeenCalled();
	});

	it("다른 페이지 또는 소유하지 않은 하이라이트는 저장하지 않는다", async () => {
		mocks.getHighlightById.mockResolvedValueOnce({ data: null, error: null });
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 8, memo: "내 생각" },
				SENDER,
			),
		).toEqual({ success: false, reason: "invalid_request" });
		mocks.getHighlightById.mockResolvedValueOnce({
			data: { id: 7, url: "https://example.com/other" },
			error: null,
		});
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				SENDER,
			),
		).toEqual({ success: false, reason: "invalid_request" });
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it("재시도 결과와 휴지통 메모 상태를 그대로 전달한다", async () => {
		mocks.create.mockResolvedValue({
			memo_id: 20,
			highlight_id: 7,
			created: false,
			deleted_at: "2026-10-11T00:00:00Z",
		});
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "다시 저장" },
				SENDER,
			),
		).toEqual({
			success: true,
			memoId: 20,
			created: false,
			deletedAt: "2026-10-11T00:00:00Z",
		});
	});

	it("알림 수신 화면이 닫혀 있어도 커밋된 저장은 성공이다", async () => {
		mocks.sendMessage.mockRejectedValue(new Error("receiver closed"));
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				SENDER,
			),
		).toMatchObject({ success: true, memoId: 20 });
	});

	it("로그인 부재와 저장 실패를 구별하고 내부 내용을 응답에 담지 않는다", async () => {
		mocks.getClient.mockRejectedValueOnce(
			new SupabaseSessionRequiredError("session missing"),
		);
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				SENDER,
			),
		).toEqual({ success: false, reason: "unauthenticated" });
		mocks.create.mockRejectedValueOnce(new Error("secret: selected text"));
		expect(
			await handleCreateHighlightMemo(
				{ highlightId: 7, memo: "내 생각" },
				SENDER,
			),
		).toEqual({ success: false, reason: "save_failed" });
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({
				feature: "highlight",
				operation: "create-linked-memo",
				stage: "handler",
			}),
		);
		expect(mocks.report.mock.calls[0][0].error.message).not.toContain("secret");
	});
});

describe("background 하이라이트 연결 조회", () => {
	it("현재 페이지의 본인 ID만 조회한다", async () => {
		expect(
			await handleGetHighlightMemoLinks({ highlightIds: [7, 8, 9] }, SENDER),
		).toEqual({ success: true, links: [{ highlight_id: 7, memo_id: 20 }] });
		expect(mocks.getHighlightsByUrl).toHaveBeenCalledWith(PAGE_URL);
		expect(mocks.getByHighlightIds).toHaveBeenCalledWith([7]);
	});

	it("연결이 없는 성공 응답과 조회 실패를 구별한다", async () => {
		mocks.getByHighlightIds.mockResolvedValueOnce([]);
		expect(
			await handleGetHighlightMemoLinks({ highlightIds: [7] }, SENDER),
		).toEqual({
			success: true,
			links: [],
		});
		mocks.getByHighlightIds.mockRejectedValueOnce(new Error("db unavailable"));
		expect(
			await handleGetHighlightMemoLinks({ highlightIds: [7] }, SENDER),
		).toEqual({
			success: false,
			reason: "load_failed",
		});
	});

	it("과도한 ID와 다른 발신 문서는 조회하지 않는다", async () => {
		expect(
			await handleGetHighlightMemoLinks(
				{ highlightIds: Array.from({ length: 101 }, (_, index) => index + 1) },
				SENDER,
			),
		).toEqual({ success: false, reason: "load_failed" });
		expect(
			await handleGetHighlightMemoLinks(
				{ highlightIds: [7] },
				{ ...SENDER, frameId: 1 },
			),
		).toEqual({ success: false, reason: "load_failed" });
		expect(mocks.getClient).not.toHaveBeenCalled();
	});
});
