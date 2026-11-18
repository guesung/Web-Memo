import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOAuth, setCookie, deleteCookie, sendEvent, afterTasks } =
	vi.hoisted(() => ({
		signInWithOAuth: vi.fn(),
		setCookie: vi.fn(),
		deleteCookie: vi.fn(),
		sendEvent: vi.fn(),
		afterTasks: [] as Array<() => unknown>,
	}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example" },
}));
vi.mock("@src/modules/i18n", () => ({
	DEFAULT_LANGUAGE: "en",
	getLanguage: () => "ko",
}));
vi.mock("@src/modules/supabase/util.server", () => ({
	getSupabaseClient: () => ({ auth: { signInWithOAuth } }),
}));
vi.mock("@src/modules/ga/measurementProtocol", () => ({
	resolveMeasurementClientId: (clientId: string | null) =>
		clientId ?? "generated-client-id",
	sendMeasurementProtocolEvent: sendEvent,
}));
vi.mock("next/headers", () => ({
	cookies: () => ({ set: setCookie, delete: deleteCookie }),
}));
vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: (task: () => unknown) => {
		afterTasks.push(task);
	},
}));

import { GET } from "./route";

const EXTENSION_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const PROVIDER_URL = "https://accounts.example/oauth?state=abc";
const EXTENSION_URL =
	"https://eaiojpmgklfngpjddhoalgcpkepgkclh.chromiumapp.org/";

const requestWith = (search: string) =>
	new NextRequest(`https://webmemo.example/auth/start${search}`);

/** `after()`로 예약된 작업을 응답 뒤에 실행된 것처럼 돌립니다. */
const runAfterTasks = async () => {
	for (const task of afterTasks.splice(0)) await task();
};

describe("GET /auth/start", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		afterTasks.length = 0;
		signInWithOAuth.mockResolvedValue({
			data: { url: PROVIDER_URL },
			error: null,
		});
	});

	it("제공자 로그인 화면으로 바로 보내고 콜백 주소를 넘긴다", async () => {
		const response = await GET(requestWith("?provider=google"));

		expect(signInWithOAuth).toHaveBeenCalledWith({
			provider: "google",
			options: { redirectTo: "https://webmemo.example/auth/callback" },
		});
		expect(response.headers.get("location")).toBe(PROVIDER_URL);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it.each(["apple", "github", ""])(
		"받지 않는 제공자(%s)면 OAuth를 시작하지 않고 로그인 페이지로 보낸다",
		async (provider) => {
			const response = await GET(requestWith(`?provider=${provider}`));

			expect(signInWithOAuth).not.toHaveBeenCalled();
			expect(response.headers.get("location")).toBe(
				"https://webmemo.example/ko/login",
			);
			expect(afterTasks).toHaveLength(0);
		},
	);

	it("OAuth 시작에 실패하면 사유를 싣지 않고 로그인 오류로 보낸다", async () => {
		signInWithOAuth.mockResolvedValue({
			data: { url: null },
			error: { message: "provider secret error" },
		});

		const response = await GET(requestWith("?provider=kakao"));

		expect(response.headers.get("location")).toBe(
			"https://webmemo.example/ko/login?error=1",
		);
		expect(afterTasks).toHaveLength(0);
	});

	it("확장의 client_id를 _ga 쿠키로 옮기고 같은 ID로 login_start를 보낸다", async () => {
		await GET(requestWith(`?provider=kakao&ext_cid=${EXTENSION_CLIENT_ID}`));
		await runAfterTasks();

		expect(setCookie).toHaveBeenCalledWith(
			"_ga",
			`GA1.1.${EXTENSION_CLIENT_ID}`,
			expect.objectContaining({ domain: ".webmemo.xyz", path: "/" }),
		);
		expect(sendEvent).toHaveBeenCalledWith({
			clientId: EXTENSION_CLIENT_ID,
			name: "login_start",
			category: "engagement",
			params: { method: "kakao" },
		});
	});

	it("client_id가 UUID 형식이 아니면 _ga 쿠키를 심지 않는다", async () => {
		await GET(requestWith("?provider=google&ext_cid=someone@example.com"));

		expect(setCookie).not.toHaveBeenCalled();
	});

	it("확장 로그인 창에서 열면 돌아갈 곳을 쿠키에 적어 둔다", async () => {
		const response = await GET(
			requestWith("?provider=google&return=extension"),
		);

		expect(setCookie).toHaveBeenCalledWith(
			"login_return",
			"extension",
			expect.objectContaining({ httpOnly: true, maxAge: 600 }),
		);
		expect(response.headers.get("location")).toBe(PROVIDER_URL);
	});

	it("웹에서 열면 이전 시도가 남긴 돌아갈 곳을 지운다", async () => {
		await GET(requestWith("?provider=google"));

		expect(deleteCookie).toHaveBeenCalledWith("login_return");
	});

	it("확장 로그인 창에서는 실패해도 로그인 페이지 대신 확장 주소로 보내 창을 닫는다", async () => {
		signInWithOAuth.mockResolvedValue({
			data: { url: null },
			error: { message: "provider secret error" },
		});

		const failed = await GET(requestWith("?provider=kakao&return=extension"));
		const rejected = await GET(requestWith("?provider=apple&return=extension"));

		expect(failed.headers.get("location")).toBe(`${EXTENSION_URL}?error=1`);
		expect(rejected.headers.get("location")).toBe(`${EXTENSION_URL}?error=1`);
	});
});
