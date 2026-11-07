import { beforeEach, describe, expect, it, vi } from "vitest";
import { signClickToken } from "../_shared/reportToken";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({ from }),
}));

type THandler = (req: Request) => Promise<Response>;

const SECRET = "s".repeat(40);
const WEB = "https://www.webmemo.xyz";
const USER_ID = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

let handler: THandler;
let environment: Record<string, string | undefined>;

const tokenFor = (destination: string, secret = SECRET) =>
  signClickToken(
    { userId: USER_ID, weekStart: "2026-10-31", kind: "report", position: "view_all", destination },
    secret,
  );

const click = (token: string | null, method = "GET") =>
  handler(
    new Request(
      `http://localhost/functions/v1/weekly-report-click${token === null ? "" : `?t=${encodeURIComponent(token)}`}`,
      { method },
    ),
  );

beforeEach(async () => {
  insert.mockReset().mockResolvedValue({ error: null });
  from.mockClear();
  environment = {
    UNSUBSCRIBE_SECRET: SECRET,
    WEB_URL: WEB,
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

describe("weekly-report-click", () => {
  it("유효한 토큰이면 클릭을 기록하고 목적지로 302한다", async () => {
    const destination = `${WEB}/ko/memos?id=7&utm_source=weekly_report`;
    const response = await click(tokenFor(destination));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(destination);
    expect(from).toHaveBeenCalledWith("weekly_report_click");
    expect(insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      week_start: "2026-10-31",
      kind: "report",
      position: "view_all",
    });
  });

  it("목적지가 웹 도메인이 아니면 기록 없이 웹 홈으로 보낸다 (오픈 리다이렉트 거부)", async () => {
    for (const destination of ["https://evil.com/phish", "https://www.webmemo.xyz.evil.com/", "javascript:alert(1)"]) {
      const response = await click(tokenFor(destination));

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(WEB);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it("서명 불일치·토큰 없음은 기록 없이 웹 홈으로 보낸다", async () => {
    const forged = tokenFor(`${WEB}/ko/memos`, "x".repeat(40));

    for (const token of [forged, "garbage", null]) {
      const response = await click(token);

      expect(response.headers.get("location")).toBe(WEB);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it("기록이 실패해도 목적지로 302한다", async () => {
    insert.mockResolvedValue({ error: { message: "db down" } });

    const destination = `${WEB}/ko/memos`;
    const response = await click(tokenFor(destination));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(destination);
  });

  it("기록 호출이 throw해도 목적지로 302한다", async () => {
    insert.mockRejectedValue(new Error("network"));

    const destination = `${WEB}/ko/memos`;
    const response = await click(tokenFor(destination));

    expect(response.headers.get("location")).toBe(destination);
  });

  it("GET이 아니면 기록하지 않는다", async () => {
    const response = await click(tokenFor(`${WEB}/ko/memos`), "HEAD");

    expect(response.headers.get("location")).toBe(WEB);
    expect(insert).not.toHaveBeenCalled();
  });

  it("시크릿이 없으면 기록 없이 웹 홈으로 보낸다", async () => {
    environment.UNSUBSCRIBE_SECRET = undefined;

    const response = await click(tokenFor(`${WEB}/ko/memos`));

    expect(response.headers.get("location")).toBe(WEB);
    expect(insert).not.toHaveBeenCalled();
  });
});
