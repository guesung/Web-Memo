import { describe, expect, test } from "vitest";
import {
  formatMemoAge,
  getKstDayStart,
  hashString,
  isHoldoutUser,
  orderByWeekSeed,
  pickResurfaceMemos,
  takeMostRecentAuthors,
} from "./resurface";

// 2026-11-07 토 10:00 KST
const NOW = new Date("2026-11-07T01:00:00Z");
const noExclude = new Set<number>();
const memoAt = (id: number, created_at: string) => ({ id, created_at });

describe("isHoldoutUser", () => {
  test("같은 user_id는 항상 같은 그룹이다", () => {
    const userId = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

    expect(isHoldoutUser(userId)).toBe(isHoldoutUser(userId));
  });

  test("대략 절반씩 나뉜다", () => {
    const holdouts = Array.from({ length: 2000 }, () => crypto.randomUUID()).filter(
      isHoldoutUser,
    ).length;

    expect(holdouts).toBeGreaterThan(900);
    expect(holdouts).toBeLessThan(1100);
  });

  test("hashString은 고정 값을 낸다 (그룹이 배포 사이에 바뀌지 않게 하는 고정점)", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});

describe("pickResurfaceMemos", () => {
  test("1년·6개월·1개월 전 같은 날 메모를 우선 고르고 오래된 순으로 돌려준다", () => {
    const picked = pickResurfaceMemos({
      candidates: [
        memoAt(1, "2026-10-07T03:00:00Z"), // 1개월 전
        memoAt(2, "2026-05-08T03:00:00Z"), // 6개월 전(+1일)
        memoAt(3, "2025-11-06T03:00:00Z"), // 1년 전(-1일)
        memoAt(4, "2026-08-01T03:00:00Z"), // 해당 없음
      ],
      excludeIds: noExclude,
      now: NOW,
      seed: "u:2026-10-31",
    });

    expect(picked.map((memo) => memo.id)).toEqual([3, 2, 1]);
  });

  test("허용 오차(±3일)를 넘으면 기념일 후보가 아니다", () => {
    const picked = pickResurfaceMemos({
      candidates: [memoAt(1, "2026-10-02T03:00:00Z")], // 1개월 전에서 5일 어긋남
      excludeIds: noExclude,
      now: NOW,
      seed: "s",
      max: 3,
    });

    // 기념일로는 못 고르지만 14일 넘은 메모라 채우기 단계에서 고른다
    expect(picked.map((memo) => memo.id)).toEqual([1]);
  });

  test("기준마다 가장 가까운 날의 메모 하나만 고른다", () => {
    const picked = pickResurfaceMemos({
      candidates: [
        memoAt(1, "2026-10-05T03:00:00Z"),
        memoAt(2, "2026-10-07T03:00:00Z"),
        memoAt(3, "2026-10-08T03:00:00Z"),
      ],
      excludeIds: noExclude,
      now: NOW,
      seed: "s",
      max: 1,
    });

    expect(picked.map((memo) => memo.id)).toEqual([2]);
  });

  test("모자라면 14일 넘은 메모를 시드 무작위로 채우고, 14일 이내는 쓰지 않는다", () => {
    const candidates = [
      memoAt(1, "2026-09-01T03:00:00Z"),
      memoAt(2, "2026-09-02T03:00:00Z"),
      memoAt(3, "2026-09-03T03:00:00Z"),
      memoAt(4, "2026-09-04T03:00:00Z"),
      memoAt(5, "2026-11-01T03:00:00Z"), // 6일 전
      memoAt(6, "2026-10-24T03:00:00Z"), // 13일 전 — 14일 이내
    ];
    const first = pickResurfaceMemos({ candidates, excludeIds: noExclude, now: NOW, seed: "a" });
    const again = pickResurfaceMemos({ candidates: [...candidates].reverse(), excludeIds: noExclude, now: NOW, seed: "a" });

    expect(first).toHaveLength(3);
    expect(first.map((memo) => memo.id)).not.toContain(5);
    // 입력 순서와 무관하게 같은 시드는 같은 결과
    expect(again).toEqual(first);
  });

  test("시드가 다르면(다른 사람·다른 주) 다른 메모가 나올 수 있다", () => {
    const candidates = Array.from({ length: 30 }, (_, index) =>
      memoAt(index + 1, `2026-0${(index % 8) + 1}-15T03:00:00Z`),
    );
    const results = new Set(
      ["a", "b", "c", "d", "e"].map((seed) =>
        pickResurfaceMemos({ candidates, excludeIds: noExclude, now: NOW, seed })
          .map((memo) => memo.id)
          .join(","),
      ),
    );

    expect(results.size).toBeGreaterThan(1);
  });

  test("이전에 보낸 메모는 기념일이어도 제외한다", () => {
    const picked = pickResurfaceMemos({
      candidates: [memoAt(1, "2026-10-07T03:00:00Z"), memoAt(2, "2026-09-01T03:00:00Z")],
      excludeIds: new Set([1]),
      now: NOW,
      seed: "s",
    });

    expect(picked.map((memo) => memo.id)).toEqual([2]);
  });

  test("고를 게 없으면 빈 배열, 1~2개뿐이면 있는 만큼만 돌려준다", () => {
    expect(
      pickResurfaceMemos({ candidates: [memoAt(1, "2026-11-05T03:00:00Z")], excludeIds: noExclude, now: NOW, seed: "s" }),
    ).toEqual([]);
    expect(
      pickResurfaceMemos({
        candidates: [memoAt(1, "2026-09-01T03:00:00Z"), memoAt(2, "2026-09-02T03:00:00Z")],
        excludeIds: noExclude,
        now: NOW,
        seed: "s",
      }),
    ).toHaveLength(2);
  });

  test("그 달에 없는 날은 말일로 맞춘다 (3월 31일의 1개월 전 = 2월 28일)", () => {
    const picked = pickResurfaceMemos({
      candidates: [memoAt(1, "2026-02-28T03:00:00Z")],
      excludeIds: noExclude,
      now: new Date("2026-03-31T01:00:00Z"),
      seed: "s",
      max: 1,
    });

    expect(picked.map((memo) => memo.id)).toEqual([1]);
  });
});

describe("formatMemoAge", () => {
  test("주·개월·년으로 읽힌다", () => {
    expect(formatMemoAge("2026-10-17T01:00:00Z", NOW)).toBe("3주 전");
    expect(formatMemoAge("2026-10-08T01:00:00Z", NOW)).toBe("4주 전");
    expect(formatMemoAge("2026-05-08T01:00:00Z", NOW)).toBe("6개월 전");
    expect(formatMemoAge("2025-11-06T01:00:00Z", NOW)).toBe("1년 전");
  });
});

describe("선별·순서", () => {
  test("takeMostRecentAuthors는 마지막 작성일 내림차순 상위 N명", () => {
    const rows = [
      { user_id: "a", last_memo_at: "2026-01-01T00:00:00Z" },
      { user_id: "b", last_memo_at: "2026-03-01T00:00:00Z" },
      { user_id: "c", last_memo_at: "2026-02-01T00:00:00Z" },
    ];

    expect(takeMostRecentAuthors(rows, 2).map((row) => row.user_id)).toEqual(["b", "c"]);
  });

  test("orderByWeekSeed는 같은 주엔 같은 순서, 주가 바뀌면 달라진다", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({ user_id: `user-${index}` }));
    const order = (week: string) => orderByWeekSeed(rows, week).map((row) => row.user_id).join();

    expect(order("2026-10-31")).toBe(order("2026-10-31"));
    expect(order("2026-10-31")).not.toBe(order("2026-11-07"));
  });

  test("getKstDayStart는 KST 0시를 UTC로 돌려준다", () => {
    expect(getKstDayStart(new Date("2026-11-08T16:00:00Z")).toISOString()).toBe("2026-11-08T15:00:00.000Z");
    expect(getKstDayStart(new Date("2026-11-08T14:59:00Z")).toISOString()).toBe("2026-11-07T15:00:00.000Z");
  });
});
