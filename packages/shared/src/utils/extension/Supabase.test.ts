import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example" },
}));

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	setSession: vi.fn(),
	getCookie: vi.fn(),
	removeSync: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
	createClient: () => ({
		auth: { getSession: mocks.getSession, setSession: mocks.setSession },
	}),
}));

beforeEach(() => {
	vi.resetModules();
	vi.stubGlobal("chrome", {
		cookies: { get: mocks.getCookie },
		storage: { sync: { remove: mocks.removeSync } },
	});
	mocks.getSession.mockReset().mockResolvedValue({ data: { session: null } });
	mocks.setSession.mockReset().mockResolvedValue({ error: null });
	mocks.getCookie.mockReset().mockResolvedValue(null);
	mocks.removeSync.mockReset().mockResolvedValue(undefined);
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
	it.each(["getSession", "setSession"] as const)(
		"%s가 4xx AuthApiError를 반환하면 로그인 필요 오류로 변환한다",
		async (method) => {
			const cause = Object.assign(new Error("Invalid Refresh Token"), {
				name: "AuthApiError",
				status: 400,
			});
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
			expect(error).toBeInstanceOf(SupabaseSessionRequiredError);
			expect(error).toMatchObject({ cause });
		},
	);
	it("AuthSessionMissingError도 로그인 필요 오류로 변환한다", async () => {
		mocks.getSession.mockResolvedValue({
			data: { session: null },
			error: Object.assign(new Error("Auth session missing!"), {
				name: "AuthSessionMissingError",
			}),
		});
		const { getSupabaseClient, SupabaseSessionRequiredError } = await import(
			"./Supabase"
		);
		await expect(getSupabaseClient()).rejects.toBeInstanceOf(
			SupabaseSessionRequiredError,
		);
	});
	it.each([500, 429])(
		"AuthApiError %i는 기존 사용자 메시지와 원인을 유지한다",
		async (status) => {
			const cause = Object.assign(new Error("server side"), {
				name: "AuthApiError",
				status,
			});
			mocks.getCookie.mockResolvedValue({ value: "test-token" });
			mocks.setSession.mockResolvedValue({ error: cause });
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

describe("예전 sync 세션 정리", () => {
	it("클라이언트를 처음 만들 때 한 번만 sync 세션 키를 지운다", async () => {
		const { getSupabaseClient } = await import("./Supabase");
		await getSupabaseClient().catch(() => {});
		await getSupabaseClient().catch(() => {});
		expect(mocks.removeSync).toHaveBeenCalledTimes(1);
		expect(mocks.removeSync).toHaveBeenCalledWith(
			"sb-czwtqukymcqoberdoltq-auth-token",
		);
	});
	it("삭제가 실패해도 무시한다", async () => {
		mocks.removeSync.mockRejectedValue(new Error("sync unavailable"));
		const { getSupabaseClient, SupabaseSessionRequiredError } = await import(
			"./Supabase"
		);
		await expect(getSupabaseClient()).rejects.toBeInstanceOf(
			SupabaseSessionRequiredError,
		);
	});
});

describe("isSessionRestoreFailure", () => {
	const authApiError = (status: number) =>
		Object.assign(new Error("auth api"), { name: "AuthApiError", status });

	it("원인 없는 로그인 필요 오류(쿠키 없음)는 세션 복원 실패가 아니다", async () => {
		const { getSupabaseClient, isSessionRestoreFailure } = await import(
			"./Supabase"
		);
		const error = await getSupabaseClient().catch((caught: unknown) => caught);

		expect(isSessionRestoreFailure(error)).toBe(false);
	});

	it.each([
		["4xx AuthApiError", authApiError(400)],
		[
			"AuthSessionMissingError",
			Object.assign(new Error("missing"), { name: "AuthSessionMissingError" }),
		],
	])(
		"인증 거부(%s)로 복원하지 못한 것은 세션 복원 실패가 아니다",
		async (_, cause) => {
			mocks.getCookie.mockResolvedValue({ value: "token" });
			mocks.setSession.mockResolvedValue({ error: cause });
			const { getSupabaseClient, isSessionRestoreFailure } = await import(
				"./Supabase"
			);
			const error = await getSupabaseClient().catch(
				(caught: unknown) => caught,
			);

			expect(isSessionRestoreFailure(error)).toBe(false);
		},
	);

	it.each([
		["네트워크 오류", new TypeError("Failed to fetch")],
		["5xx AuthApiError", authApiError(503)],
		["429 AuthApiError", authApiError(429)],
		["예상 밖 오류", new Error("unexpected")],
	])("%s로 복원하지 못하면 세션 복원 실패다", async (_, cause) => {
		mocks.getCookie.mockResolvedValue({ value: "token" });
		mocks.setSession.mockResolvedValue({ error: cause });
		const { getSupabaseClient, isSessionRestoreFailure } = await import(
			"./Supabase"
		);
		const error = await getSupabaseClient().catch((caught: unknown) => caught);

		expect(isSessionRestoreFailure(error)).toBe(true);
	});

	it("Error가 아닌 값은 세션 복원 실패로 보지 않는다", async () => {
		const { isSessionRestoreFailure } = await import("./Supabase");

		expect(isSessionRestoreFailure("로그인을 먼저 해주세요")).toBe(false);
		expect(isSessionRestoreFailure(undefined)).toBe(false);
	});
});
