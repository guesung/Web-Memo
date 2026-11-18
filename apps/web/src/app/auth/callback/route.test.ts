import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, setCookie, deleteCookie, cookieValues } =
	vi.hoisted(() => ({
		exchangeCodeForSession: vi.fn(),
		setCookie: vi.fn(),
		deleteCookie: vi.fn(),
		cookieValues: new Map<string, string>(),
	}));

vi.mock("@src/modules/i18n", () => ({
	DEFAULT_LANGUAGE: "en",
	getLanguage: () => "ko",
}));

vi.mock("@src/modules/supabase/util.server", () => ({
	getSupabaseClient: () => ({ auth: { exchangeCodeForSession } }),
}));

vi.mock("next/headers", () => ({
	cookies: () => ({
		set: setCookie,
		get: (name: string) =>
			cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined,
		delete: deleteCookie,
	}),
}));

import { GET } from "./route";

describe("GET /auth/callback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cookieValues.clear();
	});

	it("코드 교환 후 세션이 없으면 원문을 노출하지 않고 로그인 오류로 302 이동한다", async () => {
		exchangeCodeForSession.mockResolvedValue({
			data: { session: null },
			error: { message: "provider secret error" },
		});

		const response = await GET(
			new NextRequest("http://localhost/auth/callback?code=secret-code"),
		);

		expect(exchangeCodeForSession).toHaveBeenCalledWith("secret-code");
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			"http://localhost/ko/login?error=1",
		);
		expect(setCookie).not.toHaveBeenCalled();
	});

	it("세션이 있으면 토큰 쿠키를 따로 심지 않고 로그인 방법을 담아 메모로 이동한다", async () => {
		exchangeCodeForSession.mockResolvedValue({
			data: {
				session: {
					access_token: "access-token",
					refresh_token: "refresh-token",
					user: {
						app_metadata: { provider: "google" },
						created_at: "2020-01-01T00:00:00.000Z",
					},
				},
			},
		});

		const response = await GET(
			new NextRequest("http://localhost/auth/callback?code=valid-code"),
		);

		expect(response.headers.get("location")).toBe(
			"http://localhost/ko/memos?login=google",
		);
		// 확장은 웹 세션으로 전용 세션을 따로 발급받으므로 토큰 쿠키를 따로 심지 않는다.
		expect(setCookie).not.toHaveBeenCalled();
	});

	describe("확장 로그인 창에서 시작한 로그인", () => {
		const EXTENSION_URL =
			"https://eaiojpmgklfngpjddhoalgcpkepgkclh.chromiumapp.org/";

		beforeEach(() => {
			cookieValues.set("login_return", "extension");
		});

		it("세션을 교환한 뒤 메모 화면 대신 확장 주소로 보내고, 돌아갈 곳을 지운다", async () => {
			exchangeCodeForSession.mockResolvedValue({
				data: {
					session: {
						access_token: "access-token",
						refresh_token: "refresh-token",
						user: {
							app_metadata: { provider: "kakao" },
							created_at: new Date().toISOString(),
						},
					},
				},
			});

			const response = await GET(
				new NextRequest("http://localhost/auth/callback?code=valid-code"),
			);

			expect(response.headers.get("location")).toBe(
				`${EXTENSION_URL}?login=kakao&signup=true`,
			);
			// 확장은 웹 세션으로 전용 세션을 따로 발급받으므로 토큰 쿠키를 따로 심지 않는다.
			expect(setCookie).not.toHaveBeenCalled();
			expect(deleteCookie).toHaveBeenCalledWith("login_return");
		});

		it("제공자가 취소·실패를 돌려주면 확장 주소로 오류만 알린다", async () => {
			const response = await GET(
				new NextRequest("http://localhost/auth/callback?error=access_denied"),
			);

			expect(response.headers.get("location")).toBe(`${EXTENSION_URL}?error=1`);
			expect(exchangeCodeForSession).not.toHaveBeenCalled();
		});

		it("코드 교환 후 세션이 없으면 확장 주소로 오류만 알린다", async () => {
			exchangeCodeForSession.mockResolvedValue({ data: { session: null } });

			const response = await GET(
				new NextRequest("http://localhost/auth/callback?code=bad-code"),
			);

			expect(response.headers.get("location")).toBe(`${EXTENSION_URL}?error=1`);
			expect(setCookie).not.toHaveBeenCalled();
		});
	});
});
