import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  readTokenSecret,
  signClickToken,
  signUnsubscribeToken,
  verifyClickToken,
  verifyUnsubscribeToken,
} from "./reportToken";
import { isWebUrlDestination } from "./webUrl";

const SECRET = "s".repeat(40);
const OTHER_SECRET = "o".repeat(40);
const USER_ID = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

describe("수신 거부 토큰", () => {
  test("서명한 토큰은 user_id로 검증된다", () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken(USER_ID, SECRET), SECRET)).toBe(USER_ID);
  });

  test("다른 시크릿으로 만든 토큰은 거부한다", () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken(USER_ID, OTHER_SECRET), SECRET)).toBeNull();
  });

  test("user_id를 바꾸거나 서명을 변조하면 거부한다", () => {
    const [, signature] = signUnsubscribeToken(USER_ID, SECRET).split(".");
    const otherUser = "00000000-0000-4000-8000-000000000000";

    expect(verifyUnsubscribeToken(`${otherUser}.${signature}`, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(`${USER_ID}.${signature}x`, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(`${USER_ID}.${signature.slice(1)}`, SECRET)).toBeNull();
  });

  test("비었거나 형태가 깨진 토큰은 거부한다", () => {
    for (const token of [null, undefined, "", "abc", `${USER_ID}.`, `${USER_ID}.a.b`, "not-a-uuid.sig"]) {
      expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
    }
  });

  test("클릭 토큰은 수신 거부 토큰으로 쓸 수 없고 반대도 같다", () => {
    const click = signClickToken(
      { userId: USER_ID, weekStart: "2026-10-31", kind: "report", position: "x", destination: "https://www.webmemo.xyz/" },
      SECRET,
    );

    expect(verifyUnsubscribeToken(click, SECRET)).toBeNull();
    expect(verifyClickToken(signUnsubscribeToken(USER_ID, SECRET), SECRET)).toBeNull();
  });
});

describe("클릭 토큰", () => {
  const payload = {
    userId: USER_ID,
    weekStart: "2026-10-31",
    kind: "resurface" as const,
    position: "memo_1",
    destination: "https://www.webmemo.xyz/ko/memos?id=12&utm_source=weekly_report",
  };

  test("서명한 payload가 그대로 돌아온다", () => {
    expect(verifyClickToken(signClickToken(payload, SECRET), SECRET)).toEqual(payload);
  });

  test("payload 변조·다른 시크릿은 거부한다", () => {
    const token = signClickToken(payload, SECRET);
    const [data, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ u: USER_ID, w: "2026-10-31", k: "resurface", p: "memo_1", d: "https://evil.com" }),
    ).toString("base64url");

    expect(verifyClickToken(`${forged}.${signature}`, SECRET)).toBeNull();
    expect(verifyClickToken(`${data}.${signature}`, OTHER_SECRET)).toBeNull();
    expect(verifyClickToken(null, SECRET)).toBeNull();
    expect(verifyClickToken("a.b.c", SECRET)).toBeNull();
  });
});

describe("readTokenSecret", () => {
  let environment: Record<string, string | undefined>;

  beforeEach(() => {
    environment = {};
    vi.stubGlobal("Deno", { env: { get: (name: string) => environment[name] } });
  });

  test("시크릿이 없거나 짧으면 명확한 에러로 실패한다", () => {
    expect(() => readTokenSecret()).toThrow(/UNSUBSCRIBE_SECRET/);
    environment.UNSUBSCRIBE_SECRET = "short";
    expect(() => readTokenSecret()).toThrow(/UNSUBSCRIBE_SECRET/);
  });

  test("충분히 길면 그대로 돌려준다", () => {
    environment.UNSUBSCRIBE_SECRET = SECRET;
    expect(readTokenSecret()).toBe(SECRET);
  });
});

describe("isWebUrlDestination", () => {
  const WEB = "https://www.webmemo.xyz";

  test("웹 도메인(www 유무 무관)만 허용한다", () => {
    expect(isWebUrlDestination("https://www.webmemo.xyz/ko/memos?id=1", WEB)).toBe(true);
    expect(isWebUrlDestination("https://webmemo.xyz/ko/memos", WEB)).toBe(true);
  });

  test("다른 도메인·유사 도메인·userinfo·스킴 변조는 거부한다", () => {
    for (const url of [
      "https://evil.com/",
      "https://www.webmemo.xyz.evil.com/",
      "https://evilwebmemo.xyz/",
      "https://www.webmemo.xyz@evil.com/",
      "http://www.webmemo.xyz/",
      "javascript:alert(1)",
      "//evil.com",
      "not a url",
    ]) {
      expect(isWebUrlDestination(url, WEB)).toBe(false);
    }
  });
});
