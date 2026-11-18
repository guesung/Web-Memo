import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const generateLink = vi.fn();

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
	createClient: () => ({ auth: { getUser, admin: { generateLink } } }),
}));

type THandler = (req: Request) => Promise<Response>;

const ACCESS_TOKEN = "user-access-token";
const EMAIL = "user@example.com";
const HASHED_TOKEN = "hashed-token-value";

let handler: THandler;

const call = ({
	method = "POST",
	authorization = `Bearer ${ACCESS_TOKEN}`,
}: {
	method?: string;
	authorization?: string | null;
} = {}) => {
	const headers = new Headers();

	if (authorization !== null) {
		headers.set("Authorization", authorization);
	}

	return handler(new Request("http://localhost/functions/v1/extension-session", { method, headers }));
};

beforeEach(async () => {
	getUser.mockReset();
	generateLink.mockReset();

	vi.stubGlobal("Deno", {
		env: { get: () => "placeholder" },
		serve: (registered: THandler) => {
			handler = registered;
		},
	});
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.resetModules();
	await import("./index");
});

describe("extension-session 핸들러", () => {
	it("POST가 아니면 405", async () => {
		const response = await call({ method: "GET" });

		expect(response.status).toBe(405);
		expect(getUser).not.toHaveBeenCalled();
	});

	it("OPTIONS는 CORS 헤더와 함께 통과한다", async () => {
		const response = await call({ method: "OPTIONS", authorization: null });

		expect(response.status).toBe(200);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("Authorization이 없으면 401 invalid_token이고 getUser를 부르지 않는다", async () => {
		const response = await call({ authorization: null });

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "invalid_token" });
		expect(getUser).not.toHaveBeenCalled();
	});

	it("getUser가 실패하면 401 invalid_token", async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: { message: "jwt expired" } });

		const response = await call();

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "invalid_token" });
		expect(generateLink).not.toHaveBeenCalled();
	});

	it("이메일이 없는 사용자는 422 email_required", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "u1", email: undefined } }, error: null });

		const response = await call();

		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({ error: "email_required" });
		expect(generateLink).not.toHaveBeenCalled();
	});

	it("성공하면 token_hash만 돌려준다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "u1", email: EMAIL } }, error: null });
		generateLink.mockResolvedValue({
			data: { properties: { hashed_token: HASHED_TOKEN, email_otp: "123456" } },
			error: null,
		});

		const response = await call();
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(JSON.parse(text)).toEqual({ token_hash: HASHED_TOKEN });
		expect(text).not.toContain(EMAIL);
		expect(getUser).toHaveBeenCalledWith(ACCESS_TOKEN);
		expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: EMAIL });
	});

	it("generateLink 실패는 500 mint_failed이고 원인·이메일이 응답과 로그에 없다", async () => {
		getUser.mockResolvedValue({ data: { user: { id: "u1", email: EMAIL } }, error: null });
		generateLink.mockResolvedValue({ data: null, error: { message: `rate limit for ${EMAIL}` } });

		const response = await call();
		const text = await response.text();

		expect(response.status).toBe(500);
		expect(JSON.parse(text)).toEqual({ error: "mint_failed" });
		expect(text).not.toContain(EMAIL);
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(EMAIL);
	});

	it("예외가 나도 500 mint_failed", async () => {
		getUser.mockRejectedValue(new Error(`boom ${EMAIL}`));

		const response = await call();

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "mint_failed" });
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(EMAIL);
	});
});
