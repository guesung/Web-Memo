import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	reportLoginSyncMismatch,
	reportSessionRestoreFailure,
	reportSkeletonTimeout,
} from "./reportLoginFailure";

const mocks = vi.hoisted(() => ({
	report: vi.fn((_params: unknown) => true),
	getCookie: vi.fn(),
	getUser: vi.fn(),
}));
vi.mock("./reportError", () => ({
	reportSidePanelError: (params: unknown) => mocks.report(params),
}));
vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example" },
}));
vi.mock("@web-memo/shared/hooks", () => ({
	userQueryOptions: () => ({
		queryKey: ["user"],
		queryFn: () => mocks.getUser(),
		retry: false,
	}),
}));

const sessionRequiredError = async (cause?: unknown) => {
	const { SupabaseSessionRequiredError } = await import(
		"@web-memo/shared/utils/extension"
	);

	return new SupabaseSessionRequiredError(
		"로그인을 먼저 해주세요",
		cause === undefined ? undefined : { cause },
	);
};

let queryClient: QueryClient;

beforeEach(() => {
	mocks.report.mockClear();
	mocks.getCookie.mockReset().mockResolvedValue(null);
	mocks.getUser.mockReset();
	vi.stubGlobal("chrome", { cookies: { get: mocks.getCookie } });
	queryClient = new QueryClient();
});

afterEach(() => {
	queryClient.clear();
	vi.unstubAllGlobals();
});

describe("reportSessionRestoreFailure", () => {
	it("네트워크·예상 밖 원인으로 세션 복원에 실패하면 원인을 warning으로 보고한다", () => {
		const cause = new TypeError("Failed to fetch");

		expect(
			reportSessionRestoreFailure(
				new Error("로그인을 먼저 해주세요", { cause }),
			),
		).toBe(true);
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({
				error: cause,
				feature: "auth",
				operation: "restore_session",
				level: "warning",
			}),
		);
	});

	it("쿠키가 없는 순수 로그아웃은 보고하지 않는다", async () => {
		expect(reportSessionRestoreFailure(await sessionRequiredError())).toBe(
			false,
		);
		expect(mocks.report).not.toHaveBeenCalled();
	});

	it("인증 서버가 세션을 거부한 로그인 만료는 보고하지 않는다", async () => {
		const rejection = Object.assign(new Error("refresh token already used"), {
			name: "AuthApiError",
			status: 400,
		});

		expect(
			reportSessionRestoreFailure(await sessionRequiredError(rejection)),
		).toBe(false);
		expect(mocks.report).not.toHaveBeenCalled();
	});
});

describe("reportLoginSyncMismatch", () => {
	it("사용자가 확인되면 보고하지 않는다", async () => {
		queryClient.setQueryData(["supabaseClient"], {});
		mocks.getUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});

		await reportLoginSyncMismatch(queryClient);

		expect(mocks.report).not.toHaveBeenCalled();
	});

	it("사용자 쿼리가 아직 없으면 가져와서 확인한다", async () => {
		queryClient.setQueryData(["supabaseClient"], {});
		mocks.getUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});

		await reportLoginSyncMismatch(queryClient);

		expect(mocks.getUser).toHaveBeenCalledOnce();
		expect(mocks.report).not.toHaveBeenCalled();
	});

	it("클라이언트는 준비됐는데 사용자가 없으면 쿠키 유무·사용자 오류와 함께 보고한다", async () => {
		queryClient.setQueryData(["supabaseClient"], {});
		mocks.getUser.mockResolvedValue({
			data: { user: null },
			error: { message: "Auth session missing!" },
		});
		mocks.getCookie.mockImplementation(async ({ name }: { name: string }) =>
			name === "access_token" ? { value: "secret-token" } : null,
		);

		await reportLoginSyncMismatch(queryClient);

		expect(mocks.report).toHaveBeenCalledOnce();
		const params = mocks.report.mock.calls[0][0];
		expect(params).toMatchObject({
			feature: "auth",
			operation: "sync_login",
			level: "warning",
			extra: {
				hasAccessTokenCookie: true,
				hasRefreshTokenCookie: false,
				userErrorMessage: "Auth session missing!",
			},
		});
		expect(JSON.stringify(params)).not.toContain("secret-token");
	});

	it("클라이언트 쿼리가 실패했으면 그 원인 메시지와 함께 보고한다", async () => {
		await queryClient
			.fetchQuery({
				queryKey: ["supabaseClient"],
				queryFn: () =>
					Promise.reject(
						new Error("로그인을 먼저 해주세요", {
							cause: new Error("Failed to fetch"),
						}),
					),
				retry: false,
			})
			.catch(() => {});

		await reportLoginSyncMismatch(queryClient);

		expect(mocks.getUser).not.toHaveBeenCalled();
		expect(mocks.report).toHaveBeenCalledWith(
			expect.objectContaining({
				extra: expect.objectContaining({
					supabaseClientErrorMessage: "Failed to fetch",
				}),
			}),
		);
	});
});

describe("reportSkeletonTimeout", () => {
	it("끝나지 않은 쿼리 이름만 싣고 URL이 든 쿼리 키는 싣지 않는다", async () => {
		void queryClient.prefetchQuery({
			queryKey: ["memo", { url: "https://private.example/path" }],
			queryFn: () => new Promise(() => {}),
		});
		queryClient.setQueryData(["setting"], { done: true });

		reportSkeletonTimeout(queryClient, 5_000);

		const params = mocks.report.mock.calls[0][0];
		expect(params).toMatchObject({
			feature: "side_panel",
			operation: "load",
			stage: "skeleton_timeout",
			level: "warning",
			extra: {
				elapsedMs: 5_000,
				pendingQueries: [
					{ name: "memo", status: "pending", fetchStatus: "fetching" },
				],
			},
		});
		expect(JSON.stringify(params)).not.toContain("private.example");
	});
});
