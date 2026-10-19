import { formatKoreanDate } from "./weekRange.ts";

const WEB_URL = "https://webmemo.xyz";
const MEMOS_URL = `${WEB_URL}/ko/memos`;
const SETTING_URL = `${WEB_URL}/ko/memos/setting`;

/**
 * 웹 메모 링크에 UTM을 붙인다
 * @description 메일에서 들어온 방문을 GA4 유입 경로(소스·매체·캠페인)로 가르기 위해서다.
 * 메모 원문 링크에는 붙이지 않는다 — 우리 GA에 남지 않고 상대 사이트 URL만 바뀐다.
 */
export const withUtm = (
  url: string,
  { content, isTest }: { content: string; isTest: boolean },
) => {
  const target = new URL(url);

  target.searchParams.set("utm_source", "weekly_report");
  target.searchParams.set("utm_medium", "email");
  target.searchParams.set(
    "utm_campaign",
    isTest ? "weekly_memo_report_test" : "weekly_memo_report",
  );
  target.searchParams.set("utm_content", content);

  return escapeHtml(target.toString());
};

export interface IFReportMemo {
  title: string;
  url: string;
  memo: string;
  created_at: string | null;
}

/**
 * 사용자 입력을 HTML에 넣을 수 있게 이스케이프한다
 * @description 제목·URL·메모 본문은 모두 사용자가 정한 값이라 태그가 섞일 수 있다
 */
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const parseHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

/** javascript: 같은 스킴이 href로 나가지 않도록 http(s)만 링크로 쓴다 */
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

/**
 * 메모 본문을 줄바꿈을 살려 HTML로 바꾼다
 * @description white-space를 무시하는 메일 클라이언트가 있어 줄바꿈을 <br>로 직접 바꾼다
 */
const toMemoBodyHtml = (memo: string) =>
  escapeHtml(memo.trim()).replace(/\r?\n/g, "<br>");

/**
 * 주간 리포트 메일 제목을 만든다
 */
export const buildWeeklyReportSubject = ({
  count,
  isTest,
}: {
  count: number;
  isTest: boolean;
}) => {
  const subject = `이번 주에 남긴 메모 ${count}개`;

  if (isTest) {
    return `[테스트] ${subject}`;
  }

  return subject;
};

const COLOR = {
  text: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  link: "#2563eb",
  soft: "#f6f7f9",
  body: "#374151",
};
const FONT =
  "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_NAMES = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
];

export interface IFWeekSummary {
  memoCount: number;
  siteCount: number;
  /** 사이트가 2곳 이상이고 최다 개수가 2개 이상일 때만 채운다 */
  topSite: { hostname: string; count: number } | null;
  /** 최다 개수가 2개 이상일 때만 채운다 */
  topWeekday: { name: string; count: number } | null;
}

/** 순서대로 세어 최다 항목을 고른다. 동률이면 먼저 나온(=더 최신) 키가 이긴다 */
const pickTop = (keys: string[]) => {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let top: { key: string; count: number } | null = null;
  for (const [key, count] of counts) {
    if (!top || count > top.count) {
      top = { key, count };
    }
  }

  return { counts, top };
};

/**
 * 메모 데이터만으로 한 주 요약을 계산한다 (AI 사용 안 함)
 * @description memos는 최신순으로 들어온다고 가정한다. 요일은 KST 기준이다.
 */
export const buildWeekSummary = (memos: IFReportMemo[]): IFWeekSummary => {
  const hostnames = memos
    .map((memo) => parseHostname(memo.url))
    .filter((hostname) => hostname !== "");
  const site = pickTop(hostnames);

  const weekdays = memos.flatMap((memo) => {
    if (!memo.created_at) return [];
    const time = new Date(memo.created_at).getTime();
    if (Number.isNaN(time)) return [];

    return [WEEKDAY_NAMES[new Date(time + KST_OFFSET_MS).getUTCDay()]];
  });
  const weekday = pickTop(weekdays);

  return {
    memoCount: memos.length,
    siteCount: site.counts.size,
    topSite:
      site.top && site.counts.size >= 2 && site.top.count >= 2
        ?{ hostname: site.top.key, count: site.top.count }
        : null,
    topWeekday:
      weekday.top && weekday.top.count >= 2
        ? { name: weekday.top.key, count: weekday.top.count }
        : null,
  };
};

const buildSummaryParagraph = (summary: IFWeekSummary) => {
  const sentences: string[] = [];

  if (summary.siteCount > 0) {
    sentences.push(`사이트 ${summary.siteCount}곳에서 남긴 메모예요.`);
  }

  if (summary.topSite && summary.topWeekday) {
    sentences.push(
      `가장 자주 메모한 곳은 <b>${escapeHtml(summary.topSite.hostname)}</b>(${summary.topSite.count}개)이고, <b>${summary.topWeekday.name}</b>에 가장 많이 남겼어요.`,
    );
  } else if (summary.topSite) {
    sentences.push(
      `가장 자주 메모한 곳은 <b>${escapeHtml(summary.topSite.hostname)}</b>(${summary.topSite.count}개)예요.`,
    );
  } else if (summary.topWeekday) {
    sentences.push(`<b>${summary.topWeekday.name}</b>에 가장 많이 남겼어요.`);
  }

  sentences.push("다시 읽어보면 다음 주에 이어갈 거리가 보일 거예요.");

  return sentences.join(" ");
};

const TABLE_ATTRS = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

const buildHeaderHtml = ({
  rangeLabel,
  isTest,
}: {
  rangeLabel: string;
  isTest: boolean;
}) =>
  `<tr><td style="padding:0 24px 20px;border-bottom:2px solid ${COLOR.text};">` +
  `<table ${TABLE_ATTRS} width="100%"><tr>` +
  `<td style="font-size:20px;font-weight:800;letter-spacing:-0.3px;color:${COLOR.text};">웹 메모 <span style="color:${COLOR.link};">Weekly</span>${isTest ? ` <span style="font-size:12px;font-weight:600;color:${COLOR.muted};">[테스트]</span>` : ""}</td>` +
  `<td align="right" style="font-size:12px;color:${COLOR.muted};white-space:nowrap;">${escapeHtml(rangeLabel)}</td>` +
  "</tr></table></td></tr>";

const buildFooterHtml = (isTest: boolean) => {
  const footerLinkStyle = `color:${COLOR.muted};text-decoration:underline;`;

  return (
    `<tr><td style="padding:28px 24px 0;">` +
    `<table ${TABLE_ATTRS} width="100%"><tr><td style="background:${COLOR.soft};border-radius:8px;padding:16px 18px;font-size:14px;line-height:1.6;color:${COLOR.text};">` +
    `<b>리포트에 바라는 점이 있나요?</b><br>` +
    `<span style="color:${COLOR.muted};">이 메일에 바로 답장해 주시면 직접 읽고 반영할게요.</span>` +
    "</td></tr></table></td></tr>" +
    `<tr><td style="padding:24px 24px 0;font-size:12px;line-height:1.8;color:${COLOR.muted};">` +
    `${isTest ? "테스트로 보낸 메일이에요." : "매주 일요일 저녁 8시에 보내 드려요."}<br>` +
    `<a href="${withUtm(MEMOS_URL, { content: "footer_web", isTest })}" style="${footerLinkStyle}">웹에서 보기</a> &nbsp;·&nbsp; ` +
    `<a href="${withUtm(SETTING_URL, { content: "footer_setting", isTest })}" style="${footerLinkStyle}">리포트 설정 · 수신 거부</a>` +
    "</td></tr>"
  );
};

const buildMemoItemHtml = (memo: IFReportMemo, index: number) => {
  const hostname = parseHostname(memo.url);
  const titleText = escapeHtml(memo.title.trim() || hostname || memo.url);
  const titleHtml = isHttpUrl(memo.url)
    ? `<a href="${escapeHtml(memo.url)}" style="color:${COLOR.text};text-decoration:none;">${titleText}</a>`
    : titleText;
  const date = memo.created_at
    ? formatKoreanDate(new Date(memo.created_at))
    : "";
  const meta = [hostname, date].filter(Boolean).map(escapeHtml).join(" · ");
  const body = toMemoBodyHtml(memo.memo);

  return (
    `<tr><td style="padding:20px 24px;border-top:1px solid ${COLOR.line};">` +
    `<table ${TABLE_ATTRS} width="100%"><tr>` +
    `<td width="36" valign="top" style="font-size:15px;font-weight:700;color:${COLOR.link};font-variant-numeric:tabular-nums;padding-top:1px;">${String(index + 1).padStart(2, "0")}</td>` +
    `<td valign="top">` +
    (meta
      ? `<div style="font-size:12px;color:${COLOR.muted};">${meta}</div>`
      : "") +
    `<div style="margin-top:2px;font-size:16px;line-height:1.5;font-weight:700;">${titleHtml}</div>` +
    (body
      ? `<div style="margin-top:6px;font-size:14px;line-height:1.7;color:${COLOR.body};word-break:break-word;overflow-wrap:anywhere;">${body}</div>`
      : "") +
    "</td></tr></table></td></tr>"
  );
};

const wrapHtml = (rows: string) =>
  `<table ${TABLE_ATTRS} width="100%" style="background:#ffffff;"><tr><td align="center">` +
  `<table ${TABLE_ATTRS} width="600" style="width:100%;max-width:600px;font-family:${FONT};color:${COLOR.text};">` +
  rows +
  "</table></td></tr></table>";

/**
 * 주간 리포트 메일 본문을 만든다
 * @description 네이버 메일 등이 <style>을 지우므로 table 레이아웃 + 인라인 스타일만 쓴다.
 */
export const buildWeeklyReportHtml = ({
  memos,
  total,
  rangeLabel,
  isTest,
}: {
  memos: IFReportMemo[];
  total: number;
  rangeLabel: string;
  isTest: boolean;
}) => {
  const header = buildHeaderHtml({ rangeLabel, isTest });
  const accentLinkStyle = `color:${COLOR.link};text-decoration:none;font-weight:600;`;

  // 정기 발송은 0개면 보내지 않으므로 빈 주 안내는 테스트 메일에만 나간다
  if (total === 0 && isTest) {
    return wrapHtml(
      header +
        `<tr><td style="padding:28px 24px 8px;">` +
        `<div style="font-size:24px;line-height:1.4;font-weight:800;letter-spacing:-0.4px;">이번 주엔 아직 메모가 없어요</div>` +
        `<p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:${COLOR.body};">메모를 남기면 일요일 저녁에 이 주소로 모아 보내 드려요.</p>` +
        `<p style="margin:12px 0 0;font-size:14px;"><a href="${withUtm(MEMOS_URL, { content: "empty_open", isTest })}" style="${accentLinkStyle}">웹 메모 열기 →</a></p>` +
        "</td></tr>" +
        buildFooterHtml(true),
    );
  }

  const summary = buildWeekSummary(memos);

  return wrapHtml(
    header +
      `<tr><td style="padding:28px 24px 8px;">` +
      `<div style="font-size:24px;line-height:1.4;font-weight:800;letter-spacing:-0.4px;">이번 주, 메모 ${total}개를 남겼어요</div>` +
      `<p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:${COLOR.body};">${buildSummaryParagraph(summary)}</p>` +
      "</td></tr>" +
      `<tr><td style="padding:20px 24px 4px;">` +
      `<table ${TABLE_ATTRS} width="100%"><tr><td style="border:1px solid ${COLOR.line};border-radius:8px;padding:16px 18px;">` +
      `<div style="font-size:15px;font-weight:700;">웹에서 정리하기</div>` +
      `<div style="margin-top:4px;font-size:14px;line-height:1.6;color:${COLOR.muted};">이번 주 메모를 카테고리로 묶거나 다시 다듬어 보세요.</div>` +
      `<div style="margin-top:8px;font-size:14px;"><a href="${withUtm(MEMOS_URL, { content: "organize", isTest })}" style="${accentLinkStyle}">메모 정리하러 가기 →</a></div>` +
      "</td></tr></table></td></tr>" +
      `<tr><td style="padding:32px 24px 12px;font-size:13px;font-weight:700;color:${COLOR.muted};letter-spacing:0.2px;">이번 주 메모 : ${escapeHtml(rangeLabel)}</td></tr>` +
      memos.map(buildMemoItemHtml).join("") +
      `<tr><td style="padding:16px 24px 0;border-top:1px solid ${COLOR.line};font-size:14px;"><a href="${withUtm(MEMOS_URL, { content: "view_all", isTest })}" style="${accentLinkStyle}">웹에서 전체 보기 →</a></td></tr>` +
      buildFooterHtml(isTest),
  );
};
