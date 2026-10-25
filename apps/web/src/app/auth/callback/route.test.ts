import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, setCookie } = vi.hoisted(() => ({
	exchangeCodeForSession: vi.fn(),
	setCookie: vi.fn(),
}));

vi.mock("@src/modules/i18n", () => ({
	DEFAULT_LANGUAGE: "en",
	getLanguage: () => "ko",
}));

vi.mock("@src/modules/supabase/util.server", () => ({
	getSupabaseClient: () => ({ auth: { exchangeCodeForSession } }),
}));

vi.mock("next/headers", () => ({
	cookies: () => ({ set: setCookie }),
}));

import { GET } from "./route";

describe("GET /auth/callback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

	it("세션이 있으면 토큰을 저장하고 로그인 방법을 담아 메모로 이동한다", async () => {
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
		expect(setCookie).toHaveBeenCalledTimes(2);
	});
});
