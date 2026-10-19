import { describe, expect, test } from "vitest";
import {
  buildWeekSummary,
  buildWeeklyReportHtml,
  type IFReportMemo,
} from "./template";

const memo = (overrides: Partial<IFReportMemo> = {}): IFReportMemo => ({
  title: "제목",
  url: "https://a.com/x",
  memo: "본문",
  created_at: "2026-10-14T03:00:00Z",
  ...overrides,
});

describe("buildWeekSummary", () => {
  test("메모 수·사이트 수·최다 사이트·최다 요일을 센다", () => {
    const summary = buildWeekSummary([
      memo({ url: "https://a.com/1", created_at: "2026-10-14T03:00:00Z" }),
      memo({ url: "https://a.com/2", created_at: "2026-10-14T05:00:00Z" }),
      memo({ url: "https://b.com/1", created_at: "2026-10-12T05:00:00Z" }),
    ]);

    expect(summary.memoCount).toBe(3);
    expect(summary.siteCount).toBe(2);
    expect(summary.topSite).toEqual({ hostname: "a.com", count: 2 });
    expect(summary.topWeekday).toEqual({ name: "수요일", count: 2 });
  });

  test("사이트가 1곳뿐이면 최다 사이트를 생략한다", () => {
    const summary = buildWeekSummary([
      memo({ url: "https://a.com/1" }),
      memo({ url: "https://a.com/2" }),
    ]);

    expect(summary.siteCount).toBe(1);
    expect(summary.topSite).toBeNull();
  });

  test("사이트가 모두 달라 최다 개수가 1이면 최다 사이트를 생략한다", () => {
    const summary = buildWeekSummary([
      memo({ url: "https://a.com/1" }),
      memo({ url: "https://b.com/1" }),
    ]);

    expect(summary.siteCount).toBe(2);
    expect(summary.topSite).toBeNull();
  });

  test("최다 요일 개수가 1이면 요일을 생략한다", () => {
    const summary = buildWeekSummary([
      memo({ created_at: "2026-10-14T03:00:00Z" }),
      memo({ created_at: "2026-10-13T03:00:00Z" }),
    ]);

    expect(summary.topWeekday).toBeNull();
  });

  test("동률이면 최신(앞쪽) 메모가 속한 쪽을 고른다", () => {
    const summary = buildWeekSummary([
      memo({ url: "https://b.com/1", created_at: "2026-10-15T03:00:00Z" }),
      memo({ url: "https://a.com/1", created_at: "2026-10-14T03:00:00Z" }),
      memo({ url: "https://b.com/2", created_at: "2026-10-15T04:00:00Z" }),
      memo({ url: "https://a.com/2", created_at: "2026-10-14T04:00:00Z" }),
    ]);

    expect(summary.topSite?.hostname).toBe("b.com");
    expect(summary.topWeekday?.name).toBe("목요일");
  });

  test("요일은 KST 기준이다 (UTC 일요일 16시는 KST 월요일)", () => {
    const summary = buildWeekSummary([
      memo({ created_at: "2026-10-11T16:00:00Z" }),
      memo({ created_at: "2026-10-11T17:00:00Z" }),
    ]);

    expect(summary.topWeekday?.name).toBe("월요일");
  });

  test("hostname 파싱 실패와 created_at null은 집계에서 뺀다", () => {
    const summary = buildWeekSummary([
      memo({ url: "not a url", created_at: null }),
      memo({ url: "https://a.com/1", created_at: null }),
      memo({ url: "https://b.com/1", created_at: null }),
    ]);

    expect(summary.memoCount).toBe(3);
    expect(summary.siteCount).toBe(2);
    expect(summary.topWeekday).toBeNull();
  });
});

describe("buildWeeklyReportHtml", () => {
  const base = { rangeLabel: "10월 13일(월) ~ 10월 19일(일)", isTest: false };

  test("제목·본문·URL을 이스케이프한다", () => {
    const html = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [
        memo({
          title: "<script>alert(1)</script>",
          memo: "a & <b>\n둘째 줄",
          url: 'https://a.com/?q="x"',
        }),
      ],
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; &lt;b&gt;<br>둘째 줄");
    expect(html).toContain("&quot;x&quot;");
  });

  test("http(s) 외 URL은 링크로 만들지 않는다", () => {
    const html = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [memo({ url: "javascript:alert(1)", title: "위험" })],
    });

    expect(html).not.toContain("javascript:");
    expect(html).toContain("위험");
  });

  test("메모 본문을 자르지 않고 받은 순서대로 번호를 매긴다", () => {
    const long = "가".repeat(3000);
    const html = buildWeeklyReportHtml({
      ...base,
      total: 2,
      memos: [
        memo({ title: "첫째", memo: long }),
        memo({ title: "둘째", url: "https://b.com" }),
      ],
    });

    expect(html).toContain(long);
    expect(html.indexOf("첫째")).toBeLessThan(html.indexOf("둘째"));
    expect(html).toContain(">01<");
    expect(html).toContain(">02<");
  });

  test("메일 호환을 위해 <style> 없이 table 레이아웃만 쓴다", () => {
    const html = buildWeeklyReportHtml({ ...base, total: 1, memos: [memo()] });

    expect(html).not.toContain("<style");
    expect(html).toContain('role="presentation"');
  });

  test("메타는 도메인·날짜 중 있는 것만 보이고 둘 다 없으면 줄을 생략한다", () => {
    const noHost = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [memo({ url: "bad", title: "t" })],
    });
    expect(noHost).toContain("10월 14일(수)</div>");

    const noDate = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [memo({ created_at: null })],
    });
    expect(noDate).toContain(">a.com</div>");

    const neither = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [memo({ url: "bad", created_at: null, title: "t" })],
    });
    expect(neither).not.toContain("font-size:12px;color:#6b7280;\">");
  });

  test("제목이 비면 hostname, 그다음 url로 대신한다", () => {
    const byHost = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [memo({ title: "  " })],
    });
    expect(byHost).toContain(">a.com</a>");

    const byUrl = buildWeeklyReportHtml({
      ...base,
      total: 1,
      memos: [memo({ title: "", url: "bad" })],
    });
    expect(byUrl).toContain("bad</div>");
  });

  test("테스트 여부로 헤더 표식과 푸터 문구가 갈린다", () => {
    const regular = buildWeeklyReportHtml({ ...base, total: 1, memos: [memo()] });
    const test = buildWeeklyReportHtml({
      ...base,
      isTest: true,
      total: 1,
      memos: [memo()],
    });

    expect(regular).toContain("매주 일요일 저녁 8시에 보내 드려요.");
    expect(regular).not.toContain("[테스트]");
    expect(test).toContain("[테스트]");
    expect(test).toContain("테스트로 보낸 메일이에요.");
  });

  test("테스트이면서 0개면 빈 주 안내를 보낸다", () => {
    const html = buildWeeklyReportHtml({
      ...base,
      isTest: true,
      total: 0,
      memos: [],
    });

    expect(html).toContain("이번 주엔 아직 메모가 없어요");
    expect(html).toContain("웹 메모 열기 →");
    expect(html).not.toContain("웹에서 정리하기");
  });

  test("정기 발송은 0개여도 정상 경로를 탄다", () => {
    const html = buildWeeklyReportHtml({ ...base, total: 0, memos: [] });

    expect(html).toContain("이번 주, 메모 0개를 남겼어요");
  });
});
