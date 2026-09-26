import { SupabaseSessionRequiredError } from "@web-memo/shared/utils/extension";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleCreateHighlight } from "./createHighlight";

const mocks = vi.hoisted(() => ({
	getClient: vi.fn(),
	getUser: vi.fn(),
	insert: vi.fn(),
	report: vi.fn(),
}));
vi.mock("./reportBackgroundError", () => ({
	reportBackgroundError: mocks.report,
}));
vi.mock("@web-memo/shared/utils", () => ({
	normalizeUrl: (url: string) => url,
	getPageKey: (url: string) => url,
	HighlightService: class {
		insertHighlight = mocks.insert;
	},
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: mocks.getClient,
	SupabaseSessionRequiredError: class extends Error {},
}));
const PAYLOAD = {
	url: "https://example.com/article",
	title: "Article",
	favIconUrl: "",
	color: "yellow",
	anchor: {
		exact: "selected text",
		prefix: "",
		suffix: "",
		textPositionStart: 0,
	},
};
const SENDER = {
	id: "extension-id",
	url: PAYLOAD.url,
	tab: { id: 1, url: PAYLOAD.url },
	frameId: 0,
} as chrome.runtime.MessageSender;

beforeEach(() => {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.stubGlobal("chrome", { runtime: { id: "extension-id" } });
	mocks.getClient
		.mockReset()
		.mockResolvedValue({ auth: { getUser: mocks.getUser } });
	mocks.getUser.mockReset().mockResolvedValue({
		data: { user: { id: "authenticated-user" } },
		error: null,
	});
	mocks.insert
		.mockReset()
		.mockResolvedValue({ data: [{ id: 1 }], error: null });
	mocks.report.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("background 하이라이트 저장", () => {
	it("인증된 사용자와 선택한 색상으로 기존 서비스를 호출한다", async () => {
		const result = await handleCreateHighlight({
			payload: { ...PAYLOAD, user_id: "forged", color: "purple" },
			sender: SENDER,
		});
		expect(result).toEqual({ success: true, highlight: { id: 1 } });
		expect(mocks.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "authenticated-user",
				color: "purple",
				url: PAYLOAD.url,
				exact_text: PAYLOAD.anchor.exact,
			}),
		);
	});
	it.each([
		null,
		{},
		{ ...PAYLOAD, color: "red" },
		{ ...PAYLOAD, color: undefined },
		{ ...PAYLOAD, anchor: { ...PAYLOAD.anchor, exact: "x" } },
		{ ...PAYLOAD, anchor: { ...PAYLOAD.anchor, textPositionStart: -1 } },
	])("잘못된 입력은 DB 접근 전에 거절한다: %j", async (payload) => {
		expect(await handleCreateHighlight({ payload, sender: SENDER })).toEqual({
			success: false,
			error: "invalid_request",
		});
		expect(mocks.getClient).not.toHaveBeenCalled();
	});
	it.each([
		{ ...SENDER, url: "https://other.example/" },
		{ ...SENDER, id: "other" },
		{ ...SENDER, frameId: 1 },
		{ ...SENDER, url: undefined },
	])("발신 문서가 일치하지 않으면 저장하지 않는다", async (sender) => {
		expect(await handleCreateHighlight({ payload: PAYLOAD, sender })).toEqual({
			success: false,
			error: "invalid_request",
		});
		expect(mocks.insert).not.toHaveBeenCalled();
	});
	it("쿠키가 없어 기존 클라이언트가 예외를 던져도 로그인 안내로 변환한다", async () => {
		mocks.getClient.mockRejectedValue(
			new SupabaseSessionRequiredError("로그인을 먼저 해주세요"),
		);
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "unauthenticated" });
		expect(mocks.insert).not.toHaveBeenCalled();
	});
	it("검증된 사용자가 없으면 저장하지 않는다", async () => {
		mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "unauthenticated" });
		expect(mocks.insert).not.toHaveBeenCalled();
	});
	it("DB 실패는 내부 오류 내용을 노출하지 않는다", async () => {
		mocks.insert.mockResolvedValue({
			data: null,
			error: { message: "secret SQL" },
		});
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "save_failed" });
	});
	it("스토리지나 인증 서버 장애는 로그인 부재로 오인하지 않는다", async () => {
		mocks.getClient.mockRejectedValue(new Error("storage failure"));
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "save_failed" });
		mocks.getClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
		mocks.getUser.mockResolvedValue({
			data: { user: null },
			error: { status: 503 },
		});
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "save_failed" });
	});
	it.each([
		{ method: "getClient", operation: "client_initialize" },
		{ method: "getUser", operation: "auth_verify" },
		{ method: "insert", operation: "insert" },
	] as const)(
		"$operation 예외는 단계와 고정 코드만 기록한다",
		async ({ method, operation }) => {
			mocks[method].mockRejectedValue(
				new Error("secret token: raw page text https://private.example"),
			);
			expect(
				await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
			).toEqual({ success: false, error: "save_failed" });
			expect(console.warn).toHaveBeenCalledWith(
				"[Web Memo] highlight_save_failed",
				{ operation, code: "unexpected_error" },
			);
		},
	);
	it.each([
		{ status: 401, response: "unauthenticated", code: "auth_rejected" },
		{ status: 403, response: "unauthenticated", code: "auth_rejected" },
		{ status: 503, response: "save_failed", code: "auth_unavailable" },
	] as const)(
		"인증 오류 $status는 고정 진단 코드로 분류한다",
		async ({ status, response, code }) => {
			mocks.getUser.mockResolvedValue({
				data: { user: null },
				error: { status, message: "secret" },
			});
			expect(
				await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
			).toEqual({ success: false, error: response });
			expect(console.warn).toHaveBeenCalledWith(
				"[Web Memo] highlight_save_failed",
				{ operation: "auth_verify", code },
			);
		},
	);
	it.each([
		{
			error: { message: "secret SQL", details: PAYLOAD.anchor.exact },
			code: "database_error",
		},
		{ error: null, code: "empty_result" },
	])("DB 반환 실패는 $code 코드만 기록한다", async ({ error, code }) => {
		mocks.insert.mockResolvedValue({ data: [], error });
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "save_failed" });
		expect(console.warn).toHaveBeenCalledWith(
			"[Web Memo] highlight_save_failed",
			{ operation: "insert", code },
		);
	});
	it("실제 로그인 부재는 고정 session_missing 코드만 기록한다", async () => {
		mocks.getClient.mockRejectedValue(
			new SupabaseSessionRequiredError("sensitive"),
		);
		expect(
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER }),
		).toEqual({ success: false, error: "unauthenticated" });
		expect(console.warn).toHaveBeenCalledWith(
			"[Web Memo] highlight_save_failed",
			{ operation: "client_initialize", code: "session_missing" },
		);
	});
	it("pushState 이후 Chrome의 현재 탭 URL로 저장하고 최초 문서 URL은 origin 검증에 사용한다", async () => {
		const url = "https://example.com/another-article";
		const sender = {
			...SENDER,
			tab: { id: 1, url },
		} as chrome.runtime.MessageSender;
		expect(
			await handleCreateHighlight({ payload: { ...PAYLOAD, url }, sender }),
		).toEqual({ success: true, highlight: { id: 1 } });
		expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ url }));
	});
	it.each([
		{
			tab: { id: 1, url: "https://other.example/another-article" },
			payloadUrl: "https://other.example/another-article",
		},
		{
			tab: { id: 1, url: "https://example.com/another-article" },
			payloadUrl: PAYLOAD.url,
		},
		{ tab: { id: 1 }, payloadUrl: PAYLOAD.url },
	])(
		"현재 탭 URL을 위조하거나 다른 origin으로 이동한 오래된 문서 요청은 거절한다",
		async ({ tab, payloadUrl }) => {
			const sender = { ...SENDER, tab } as chrome.runtime.MessageSender;
			expect(
				await handleCreateHighlight({
					payload: { ...PAYLOAD, url: payloadUrl },
					sender,
				}),
			).toEqual({ success: false, error: "invalid_request" });
			expect(mocks.getClient).not.toHaveBeenCalled();
			expect(mocks.insert).not.toHaveBeenCalled();
		},
	);
	it.each([
		{
			setup: () =>
				mocks.insert.mockResolvedValue({
					data: [],
					error: { message: "secret SQL" },
				}),
			stage: "insert_database_error",
		},
		{
			setup: () => mocks.insert.mockResolvedValue({ data: [], error: null }),
			stage: "insert_empty_result",
		},
		{
			setup: () =>
				mocks.getUser.mockResolvedValue({
					data: { user: null },
					error: { status: 503 },
				}),
			stage: "auth_verify_auth_unavailable",
		},
		{
			setup: () => mocks.getClient.mockRejectedValue(new Error("boom")),
			stage: "client_initialize_unexpected_error",
		},
	])(
		"저장 실패 $stage는 고정 문자열 오류로 Sentry에 보고한다",
		async ({ setup, stage }) => {
			setup();
			await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER });
			expect(mocks.report).toHaveBeenCalledTimes(1);

			const params = mocks.report.mock.calls[0][0];
			expect(params).toMatchObject({
				feature: "highlight",
				operation: "create",
				stage,
			});
			expect(params.error.message).not.toMatch(/secret|boom|example\.com/);
		},
	);
	it.each([
		{
			setup: () =>
				mocks.getClient.mockRejectedValue(
					new SupabaseSessionRequiredError("로그인"),
				),
		},
		{
			setup: () =>
				mocks.getUser.mockResolvedValue({
					data: { user: null },
					error: { status: 401 },
				}),
		},
		{
			setup: () =>
				mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }),
		},
	])("로그인 부재처럼 정상적인 실패는 보고하지 않는다", async ({ setup }) => {
		setup();
		await handleCreateHighlight({ payload: PAYLOAD, sender: SENDER });
		expect(mocks.report).not.toHaveBeenCalled();
	});
});
