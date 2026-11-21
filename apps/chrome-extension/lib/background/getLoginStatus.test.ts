import { SupabaseSessionRequiredError } from "@web-memo/shared/utils/extension";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleGetLoginStatus } from "./getLoginStatus";

const mocks = vi.hoisted(() => ({
	getClient: vi.fn(),
	getSession: vi.fn(),
	getUser: vi.fn(),
}));
vi.mock("./reportBackgroundError", () => ({
	reportBackgroundError: vi.fn(),
}));
vi.mock("@web-memo/shared/utils", () => ({
	normalizeUrl: (url: string) => url,
	HighlightService: class {},
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: mocks.getClient,
	SupabaseSessionRequiredError: class extends Error {},
}));

beforeEach(() => {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	mocks.getClient.mockReset().mockResolvedValue({
		auth: { getSession: mocks.getSession, getUser: mocks.getUser },
	});
	mocks.getSession.mockReset().mockResolvedValue({
		data: { session: { access_token: "token" } },
		error: null,
	});
	mocks.getUser.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("background 로그인 여부 조회", () => {
	it("저장된 세션이 있으면 서버 검증 없이 로그인으로 판단한다", async () => {
		expect(await handleGetLoginStatus()).toEqual({ isLoggedIn: true });
		expect(mocks.getUser).not.toHaveBeenCalled();
	});
	it("쿠키가 없어 클라이언트가 세션 필요 오류를 던지면 로그아웃으로 판단한다", async () => {
		mocks.getClient.mockRejectedValue(
			new SupabaseSessionRequiredError("로그인을 먼저 해주세요"),
		);
		expect(await handleGetLoginStatus()).toEqual({ isLoggedIn: false });
		expect(console.warn).not.toHaveBeenCalled();
	});
	it.each([
		{ data: { session: null }, error: null },
		{ data: { session: null }, error: { message: "secret" } },
	])("세션이 없거나 조회 오류면 로그아웃으로 판단한다", async (result) => {
		mocks.getSession.mockResolvedValue(result);
		expect(await handleGetLoginStatus()).toEqual({ isLoggedIn: false });
	});
	it.each([
		{ method: "getClient" },
		{ method: "getSession" },
	] as const)(
		"$method 예외는 false로 돌려주고 원인 없이 고정 코드만 기록한다",
		async ({ method }) => {
			mocks[method].mockRejectedValue(new Error("secret token"));
			expect(await handleGetLoginStatus()).toEqual({ isLoggedIn: false });
			expect(console.warn).toHaveBeenCalledWith(
				"[Web Memo] login_status_check_failed",
			);
		},
	);
});
