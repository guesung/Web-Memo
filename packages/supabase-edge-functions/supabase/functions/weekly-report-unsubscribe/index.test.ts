import { beforeEach, describe, expect, it, vi } from "vitest";
import { signUnsubscribeToken } from "../_shared/reportToken";

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({ from }),
}));

type THandler = (req: Request) => Promise<Response>;

const SECRET = "s".repeat(40);
const USER_ID = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

let handler: THandler;
let environment: Record<string, string | undefined>;

const validToken = () => signUnsubscribeToken(USER_ID, SECRET);

const json = (body: unknown) =>
  handler(
    new Request("http://localhost/functions/v1/weekly-report-unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const oneClick = (token: string, body = "List-Unsubscribe=One-Click") =>
  handler(
    new Request(
      `http://localhost/functions/v1/weekly-report-unsubscribe?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    ),
  );

beforeEach(async () => {
  upsert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
  environment = {
    UNSUBSCRIBE_SECRET: SECRET,
    SUPABASE_URL: "http://localhost:54321",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
  };
  vi.stubGlobal("Deno", {
    env: { get: (name: string) => environment[name] },
    serve: (registered: THandler) => {
      handler = registered;
    },
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.resetModules();
  await import("./index");
});

describe("weekly-report-unsubscribe", () => {
  it("JSON { token }으로 수신 거부하면 설정을 끄고 ok를 돌려준다", async () => {
    const response = await json({ token: validToken() });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(from).toHaveBeenCalledWith("setting");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: USER_ID, weekly_report_enabled: false },
      { onConflict: "user_id" },
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("One-Click form body + 쿼리 토큰도 처리한다", async () => {
    const response = await oneClick(validToken());

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("One-Click 본문이 아니면 400", async () => {
    const response = await oneClick(validToken(), "foo=bar");

    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("변조·누락 토큰은 401 invalid_token이고 DB를 쓰지 않는다", async () => {
    const tampered = `${validToken()}x`;

    for (const body of [{ token: tampered }, { token: "" }, {}]) {
      const response = await json(body);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "invalid_token" });
    }
    expect(upsert).not.toHaveBeenCalled();
  });

  it("깨진 JSON은 400", async () => {
    expect((await json("{not json")).status).toBe(400);
  });

  it("POST가 아니면 405, OPTIONS는 CORS 허용", async () => {
    const get = await handler(new Request("http://localhost/x", { method: "GET" }));
    const options = await handler(new Request("http://localhost/x", { method: "OPTIONS" }));

    expect(get.status).toBe(405);
    expect(options.status).toBe(200);
    expect(options.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("저장 실패는 500이고 성공으로 위장하지 않는다", async () => {
    upsert.mockResolvedValue({ error: { message: "db down" } });

    const response = await json({ token: validToken() });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "internal_error" });
  });

  it("UNSUBSCRIBE_SECRET이 없으면 500이고 토큰 검증을 통과시키지 않는다", async () => {
    environment.UNSUBSCRIBE_SECRET = undefined;

    const response = await json({ token: validToken() });

    expect(response.status).toBe(500);
    expect(upsert).not.toHaveBeenCalled();
  });
});
