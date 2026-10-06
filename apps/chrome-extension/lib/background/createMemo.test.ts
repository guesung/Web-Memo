import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleCreateMemo } from "./createMemo";

const mocks = vi.hoisted(() => ({
	getClient: vi.fn(),
	getMemoByUrl: vi.fn(),
	updateMemo: vi.fn(),
	insertMemo: vi.fn(),
	report: vi.fn(),
}));
vi.mock("./reportBackgroundError", () => ({
	reportBackgroundError: mocks.report,
}));
vi.mock("@web-memo/shared/utils", () => ({
	normalizeUrl: (url: string) => url,
	MemoService: class {
		getMemoByUrl = mocks.getMemoByUrl;
		updateMemo = mocks.updateMemo;
		insertMemo = mocks.insertMemo;
	},
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: mocks.getClient,
	I18n: { get: () => "저장에 실패했습니다" },
}));

const PAYLOAD = {
	memo: "새 메모",
	url: "https://example.com/article",
	title: "Article",
	favIconUrl: "",
	isWish: false,
	category_id: null,
};

beforeEach(() => {
	mocks.getClient.mockReset().mockResolvedValue({});
	mocks.getMemoByUrl.mockReset().mockResolvedValue({ data: [], error: null });
	mocks.updateMemo
		.mockReset()
		.mockResolvedValue({ data: [{ id: 1 }], error: null });
	mocks.insertMemo
		.mockReset()
		.mockResolvedValue({ data: [{ id: 1 }], error: null });
	mocks.report.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("background 메모 생성", () => {
	it("같은 URL의 기존 메모가 없으면 새로 만든다", async () => {
		expect(await handleCreateMemo(PAYLOAD)).toEqual({ success: true });
		expect(mocks.insertMemo).toHaveBeenCalledWith(
			expect.objectContaining({ memo: PAYLOAD.memo, url: PAYLOAD.url }),
		);
		expect(mocks.updateMemo).not.toHaveBeenCalled();
	});
	it("같은 URL의 기존 메모가 있으면 줄바꿈으로 이어 붙인다", async () => {
		mocks.getMemoByUrl.mockResolvedValue({
			data: [{ id: 7, memo: "기존 메모" }],
			error: null,
		});
		expect(await handleCreateMemo(PAYLOAD)).toEqual({ success: true });
		expect(mocks.updateMemo).toHaveBeenCalledWith({
			id: 7,
			request: { memo: `기존 메모\n\n${PAYLOAD.memo}` },
		});
		expect(mocks.insertMemo).not.toHaveBeenCalled();
	});
	it("기존 메모의 memo 필드가 빈 문자열이면 줄바꿈 없이 이어 붙인다", async () => {
		mocks.getMemoByUrl.mockResolvedValue({
			data: [{ id: 7, memo: "" }],
			error: null,
		});
		await handleCreateMemo(PAYLOAD);
		expect(mocks.updateMemo).toHaveBeenCalledWith({
			id: 7,
			request: { memo: PAYLOAD.memo },
		});
	});
	it("같은 URL의 메모가 여러 개면 저장하지 않고 multiple_memos를 돌려준다", async () => {
		mocks.getMemoByUrl.mockResolvedValue({
			data: [{ id: 1, memo: "a" }, { id: 2, memo: "b" }],
			error: null,
		});
		expect(await handleCreateMemo(PAYLOAD)).toEqual({
			success: false,
			error: "multiple_memos",
		});
		expect(mocks.report).not.toHaveBeenCalled();
		expect(mocks.updateMemo).not.toHaveBeenCalled();
		expect(mocks.insertMemo).not.toHaveBeenCalled();
	});
	it("조회 실패는 lookup 단계로 보고하고 서버 메시지를 그대로 돌려준다", async () => {
		mocks.getMemoByUrl.mockResolvedValue({
			data: null,
			error: { message: "조회 실패" },
		});
		expect(await handleCreateMemo(PAYLOAD)).toEqual({
			success: false,
			error: "조회 실패",
		});
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({
				feature: "memo",
				operation: "create-memo",
				stage: "lookup",
			}),
		);
	});
	it("수정 실패는 update 단계로 보고한다", async () => {
		mocks.getMemoByUrl.mockResolvedValue({
			data: [{ id: 7, memo: "기존 메모" }],
			error: null,
		});
		mocks.updateMemo.mockResolvedValue({
			data: null,
			error: { message: "수정 실패" },
		});
		expect(await handleCreateMemo(PAYLOAD)).toEqual({
			success: false,
			error: "수정 실패",
		});
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({ stage: "update" }),
		);
	});
	it("삽입 실패는 insert 단계로 보고한다", async () => {
		mocks.insertMemo.mockResolvedValue({
			data: null,
			error: { message: "삽입 실패" },
		});
		expect(await handleCreateMemo(PAYLOAD)).toEqual({
			success: false,
			error: "삽입 실패",
		});
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({ stage: "insert" }),
		);
	});
	it("예기치 못한 예외는 handler 단계로 보고하고 예외 메시지를 돌려준다", async () => {
		mocks.getClient.mockRejectedValue(new Error("네트워크 오류"));
		expect(await handleCreateMemo(PAYLOAD)).toEqual({
			success: false,
			error: "네트워크 오류",
		});
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({ stage: "handler" }),
		);
	});
	it("Error가 아닌 예외는 번역된 기본 메시지를 돌려준다", async () => {
		mocks.getClient.mockRejectedValue("문자열 예외");
		expect(await handleCreateMemo(PAYLOAD)).toEqual({
			success: false,
			error: "저장에 실패했습니다",
		});
	});
});
