import { formatKoreanDate } from "./weekRange.ts";

const WEB_URL = "https://webmemo.xyz";
const MEMOS_URL = `${WEB_URL}/ko/memos`;
const SETTING_URL = `${WEB_URL}/ko/memos/setting`;

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

const TEXT_COLOR = "#0a0a0a";
const MUTED_COLOR = "#636363";
const DIVIDER_COLOR = "#e3e3e3";
const LINK_COLOR = "#2563eb";

const linkStyle = `color:${LINK_COLOR};text-decoration:none;`;

const buildMemoItemHtml = (memo: IFReportMemo) => {
  const hostname = parseHostname(memo.url);
  const titleText = escapeHtml(memo.title.trim() || hostname || memo.url);
  const titleHtml = isHttpUrl(memo.url)
    ? `<a href="${escapeHtml(memo.url)}" style="${linkStyle}font-weight:600;">${titleText}</a>`
    : `<span style="font-weight:600;">${titleText}</span>`;
  const meta = memo.created_at
    ? formatKoreanDate(new Date(memo.created_at))
    : "";
  const body = toMemoBodyHtml(memo.memo);

  return [
    `<div style="padding:14px 0;border-top:1px solid ${DIVIDER_COLOR};">`,
    `<div>${titleHtml}</div>`,
    meta
      ? `<div style="font-size:13px;color:${MUTED_COLOR};">${escapeHtml(meta)}</div>`
      : "",
    body
      ? `<div style="margin-top:4px;overflow-wrap:anywhere;word-break:break-word;">${body}</div>`
      : "",
    "</div>",
  ].join("");
};

/**
 * 주간 리포트 메일 본문을 만든다
 * @description 메일 클라이언트마다 CSS 지원이 제각각이라 템플릿 엔진 없이 인라인 스타일만 쓴다.
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
  const wrapperOpen = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;font-size:15px;line-height:1.7;color:${TEXT_COLOR};max-width:560px;">`;
  const rangeHtml = `<p style="margin:0 0 16px;font-size:13px;color:${MUTED_COLOR};">${escapeHtml(rangeLabel)}</p>`;
  const footerStyle = `margin:24px 0 0;padding-top:16px;border-top:1px solid ${DIVIDER_COLOR};font-size:13px;color:${MUTED_COLOR};`;
  const settingLink = `<a href="${SETTING_URL}" style="${linkStyle}">설정에서 끌 수 있어요 →</a>`;

  // 정기 발송은 0개면 보내지 않으므로 빈 주 안내는 테스트 메일에만 나간다
  if (total === 0 && isTest) {
    return [
      wrapperOpen,
      '<p style="margin:0 0 4px;font-weight:600;">이번 주엔 아직 메모가 없어요.</p>',
      rangeHtml,
      "<p>메모를 남기면 일요일 저녁에 이 주소로 모아 보내 드려요.</p>",
      `<p><a href="${MEMOS_URL}" style="${linkStyle}">웹 메모 열기 →</a></p>`,
      `<p style="${footerStyle}">테스트로 보낸 메일이에요. ${settingLink}</p>`,
      "</div>",
    ].join("");
  }

  return [
    wrapperOpen,
    `<p style="margin:0 0 4px;font-weight:600;">이번 주에 메모 ${total}개를 남기셨어요.</p>`,
    rangeHtml,
    ...memos.map(buildMemoItemHtml),
    `<div style="padding-top:14px;border-top:1px solid ${DIVIDER_COLOR};">`,
    `<p style="margin:0;"><a href="${MEMOS_URL}" style="${linkStyle}">웹에서 전체 보기 →</a></p>`,
    "</div>",
    `<p style="${footerStyle}">매주 일요일 저녁에 보내 드려요. ${settingLink}</p>`,
    "</div>",
  ].join("");
};
