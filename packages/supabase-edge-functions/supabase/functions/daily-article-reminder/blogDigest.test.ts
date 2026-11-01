import { describe, expect, test, vi } from "vitest";
import {
  type IFDigestDeps,
  isBlogDigestEnabled,
  runBlogDigest,
} from "./blogDigest";

const USER = "user-1";
// 2026-10-25 23:00:00Z = KST 08:00
const KST_8AM = new Date("2026-10-25T23:00:00Z");

const createDeps = (overrides: Partial<IFDigestDeps> = {}) => {
  const deps = {
    fetchSubscribedUserIds: vi.fn(async (ids: string[]) => new Set(ids)),
    hasDigestSentOn: vi.fn(async () => false),
    fetchCandidates: vi.fn(async () => ({
      count: 3,
      latestTitle: "최신 글",
      since: "2026-10-20T00:00:00Z",
    })),
    fetchTokens: vi.fn(async () => [{ token: "ExponentPushToken[a]" }]),
    sendPush: vi.fn(async () => true),
    insertLog: vi.fn(async () => undefined),
    logError: vi.fn(),
    ...overrides,
  };

  return deps;
};

const run = (
  deps: IFDigestDeps,
  options: Partial<Parameters<typeof runBlogDigest>[0]> = {},
) =>
  runBlogDigest(
    {
      enabled: true,
      now: KST_8AM,
      schedules: [{ user_id: USER, notifyTime: "08:00:00" }],
      timezones: new Map(),
      ...options,
    },
    deps,
  );

describe("isBlogDigestEnabled", () => {
  test.each([
    ["true", true],
    ["false", false],
    ["1", false],
    ["TRUE", false],
    ["", false],
    [undefined, false],
  ])("%s -> %s", (value, expected) => {
    expect(isBlogDigestEnabled(value)).toBe(expected);
  });
});

describe("runBlogDigest", () => {
  test("게이트가 꺼져 있으면 아무 것도 호출하지 않고 null", async () => {
    const deps = createDeps();

    expect(await run(deps, { enabled: false })).toBeNull();
    expect(deps.fetchSubscribedUserIds).not.toHaveBeenCalled();
    expect(deps.fetchCandidates).not.toHaveBeenCalled();
    expect(deps.sendPush).not.toHaveBeenCalled();
    expect(deps.insertLog).not.toHaveBeenCalled();
  });

  test("정상 발송: payload와 이력", async () => {
    const deps = createDeps();

    expect(await run(deps)).toEqual({ notified: 1, skipped: 0, failed: 0 });
    expect(deps.sendPush).toHaveBeenCalledWith(
      [{ token: "ExponentPushToken[a]" }],
      {
        title: "긱뉴스 새 글 3개",
        body: "최신 글",
        data: { type: "blog_digest", blogId: "geeknews" },
      },
    );
    expect(deps.insertLog).toHaveBeenCalledWith({
      userId: USER,
      sentOn: "2026-10-26",
      articleCount: 3,
    });
  });

  test("data에 url이 없다", async () => {
    const deps = createDeps();

    await run(deps);

    const payload = deps.sendPush.mock.calls[0][1];
    expect(payload.data).not.toHaveProperty("url");
  });

  test("후보 0개면 보내지 않는다", async () => {
    const deps = createDeps({
      fetchCandidates: vi.fn(async () => ({
        count: 0,
        latestTitle: null,
        since: null,
      })),
    });

    expect(await run(deps)).toEqual({ notified: 0, skipped: 1, failed: 0 });
    expect(deps.sendPush).not.toHaveBeenCalled();
    expect(deps.insertLog).not.toHaveBeenCalled();
  });

  test("오늘 이력이 있으면 후보 조회도 하지 않는다", async () => {
    const deps = createDeps({ hasDigestSentOn: vi.fn(async () => true) });

    expect(await run(deps)).toEqual({ notified: 0, skipped: 1, failed: 0 });
    expect(deps.fetchCandidates).not.toHaveBeenCalled();
    expect(deps.sendPush).not.toHaveBeenCalled();
  });

  test("미구독이면 아무 것도 하지 않는다", async () => {
    const deps = createDeps({ fetchSubscribedUserIds: vi.fn(async () => new Set<string>()) });

    expect(await run(deps)).toEqual({ notified: 0, skipped: 1, failed: 0 });
    expect(deps.hasDigestSentOn).not.toHaveBeenCalled();
    expect(deps.fetchCandidates).not.toHaveBeenCalled();
  });

  test("토큰이 없으면 보내지 않고 이력도 없다", async () => {
    const deps = createDeps({ fetchTokens: vi.fn(async () => []) });

    expect(await run(deps)).toEqual({ notified: 0, skipped: 1, failed: 0 });
    expect(deps.sendPush).not.toHaveBeenCalled();
    expect(deps.insertLog).not.toHaveBeenCalled();
  });

  test("켜진 시각이 없으면 구독 조회도 하지 않는다", async () => {
    const deps = createDeps();

    expect(await run(deps, { schedules: [] })).toEqual({ notified: 0, skipped: 0, failed: 0 });
    expect(deps.fetchSubscribedUserIds).not.toHaveBeenCalled();
  });

  test("지금 버킷이 아닌 시각은 건너뛴다", async () => {
    const deps = createDeps();

    const result = await run(deps, {
      schedules: [{ user_id: USER, notifyTime: "09:00" }],
    });

    expect(result).toEqual({ notified: 0, skipped: 0, failed: 0 });
    expect(deps.fetchCandidates).not.toHaveBeenCalled();
  });

  test("Expo 실패면 이력을 남기지 않고 failed", async () => {
    const deps = createDeps({ sendPush: vi.fn(async () => false) });

    expect(await run(deps)).toEqual({ notified: 0, skipped: 0, failed: 1 });
    expect(deps.insertLog).not.toHaveBeenCalled();
  });

  test("Expo 호출이 throw해도 이력이 없고 다른 사용자는 계속 처리한다", async () => {
    const deps = createDeps({
      sendPush: vi
        .fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValueOnce(true),
    });

    const result = await run(deps, {
      schedules: [
        { user_id: "a", notifyTime: "08:00" },
        { user_id: "b", notifyTime: "08:00" },
      ],
    });

    expect(result).toEqual({ notified: 1, skipped: 0, failed: 1 });
    expect(deps.insertLog).toHaveBeenCalledTimes(1);
    expect(deps.logError).toHaveBeenCalled();
  });

  test("이력 기록이 실패해도 발송은 성공으로 세고 오류를 남긴다", async () => {
    const deps = createDeps({
      insertLog: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    expect(await run(deps)).toEqual({ notified: 1, skipped: 0, failed: 1 });
    expect(deps.logError).toHaveBeenCalled();
  });

  test("같은 버킷에 켜진 시각이 여럿이어도 사용자당 한 번만 보낸다", async () => {
    const deps = createDeps();

    await run(deps, {
      schedules: [
        { user_id: USER, notifyTime: "08:00" },
        { user_id: USER, notifyTime: "08:10" },
      ],
    });

    expect(deps.sendPush).toHaveBeenCalledTimes(1);
  });

  test("시간대 날짜: Asia/Seoul 00:30은 UTC 전날이어도 서울 날짜로 기록한다", async () => {
    const deps = createDeps();
    // 2026-10-25 15:30Z = KST 2026-10-26 00:30
    const now = new Date("2026-10-25T15:30:00Z");

    await run(deps, {
      now,
      schedules: [{ user_id: USER, notifyTime: "00:30" }],
    });

    expect(deps.hasDigestSentOn).toHaveBeenCalledWith(USER, "2026-10-26");
    expect(deps.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({ sentOn: "2026-10-26" }),
    );
  });

  test("notification_setting의 timezone을 쓴다", async () => {
    const deps = createDeps();
    // 2026-10-25 23:00Z = New York 19:00 (EDT, 10-25 일요일)
    const result = await run(deps, {
      schedules: [{ user_id: USER, notifyTime: "19:00" }],
      timezones: new Map([[USER, "America/New_York"]]),
    });

    expect(result?.notified).toBe(1);
    expect(deps.hasDigestSentOn).toHaveBeenCalledWith(USER, "2026-10-25");
  });

  test("잘못된 timezone은 그 사용자만 failed로 세고 나머지는 계속한다", async () => {
    const deps = createDeps();

    const result = await run(deps, {
      schedules: [
        { user_id: "bad", notifyTime: "08:00" },
        { user_id: "good", notifyTime: "08:00" },
      ],
      timezones: new Map([["bad", "Not/AZone"]]),
    });

    expect(result).toEqual({ notified: 1, skipped: 0, failed: 1 });
  });
});
