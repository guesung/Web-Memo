import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example" },
}));

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	setSession: vi.fn(),
	getCookie: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
	createClient: () => ({
		auth: { getSession: mocks.getSession, setSession: mocks.setSession },
	}),
}));
vi.mock("../../modules/chrome-storage", () => ({ ChromeSyncStorage: {} }));

beforeEach(() => {
	vi.resetModules();
	vi.stubGlobal("chrome", { cookies: { get: mocks.getCookie } });
	mocks.getSession.mockReset().mockResolvedValue({ data: { session: null } });
	mocks.setSession.mockReset().mockResolvedValue({ error: null });
	mocks.getCookie.mockReset().mockResolvedValue(null);
});

describe("확장 Supabase 초기화 오류 계약", () => {
	it("세션과 쿠키가 없을 때만 명시적인 로그인 필요 오류를 보낸다", async () => {
		const { getSupabaseClient, SupabaseSessionRequiredError } = await import(
			"./Supabase"
		);
		await expect(getSupabaseClient()).rejects.toBeInstanceOf(
			SupabaseSessionRequiredError,
		);
	});
	it("스토리지 장애는 기존 사용자 메시지와 원인을 유지한다", async () => {
		const cause = new Error("storage unavailable");
		mocks.getSession.mockRejectedValue(cause);
		const { getSupabaseClient, SupabaseSessionRequiredError } = await import(
			"./Supabase"
		);
		const error = await getSupabaseClient().catch((caught: unknown) => caught);
		expect(error).toMatchObject({ message: "로그인을 먼저 해주세요", cause });
		expect(error).not.toBeInstanceOf(SupabaseSessionRequiredError);
	});
	it("기존 세션이 있으면 쿠키를 읽지 않고 같은 클라이언트를 반환한다", async () => {
		mocks.getSession.mockResolvedValue({
			data: { session: { access_token: "test" } },
		});
		const { getSupabaseClient } = await import("./Supabase");
		const client = await getSupabaseClient();
		expect(await getSupabaseClient()).toBe(client);
		expect(mocks.getCookie).not.toHaveBeenCalled();
	});
	it.each(["getSession", "setSession"] as const)(
		"%s가 오류 값을 반환하면 원인을 보존하고 실패한다",
		async (method) => {
			const cause = new Error("auth transport failure");
			if (method === "getSession") {
				mocks.getSession.mockResolvedValue({
					data: { session: null },
					error: cause,
				});
			} else {
				mocks.getCookie.mockResolvedValue({ value: "test-token" });
				mocks.setSession.mockResolvedValue({ error: cause });
			}
			const { getSupabaseClient, SupabaseSessionRequiredError } = await import(
				"./Supabase"
			);
			const error = await getSupabaseClient().catch(
				(caught: unknown) => caught,
			);
			expect(error).toMatchObject({ message: "로그인을 먼저 해주세요", cause });
			expect(error).not.toBeInstanceOf(SupabaseSessionRequiredError);
		},
	);
});
