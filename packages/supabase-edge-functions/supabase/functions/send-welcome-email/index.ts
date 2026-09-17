import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** auth.users 에 새로 생긴 행. INSERT 트리거가 record로 넘겨준다 */
interface IFSignedUpUserRecord {
  id: string;
  email: string | null;
  /** OAuth 제공자가 준 표시 이름. Apple·이메일 가입자는 대개 없다 */
  name: string | null;
  created_at: string;
}

const SENDER = "웹 메모 <hello@webmemo.xyz>";
const REPLY_TO = "gueit214@naver.com";

const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh";
const MEMOS_URL = "https://webmemo.xyz/memos";

/**
 * 사용자 입력을 HTML에 넣을 수 있게 이스케이프한다
 * @description 이름은 사용자가 OAuth 제공자에 직접 정한 값이라 태그가 섞일 수 있다
 */
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * 가입 안내 메일 제목을 만든다
 * @description 이름이 없으면 "님"만 남지 않도록 호칭을 통째로 뺀다
 */
const buildWelcomeEmailSubject = (name: string | null) => {
  if (!name) {
    return "웹 메모에 오신 걸 환영해요";
  }

  return `${name}님, 웹 메모에 오신 걸 환영해요`;
};

/**
 * 가입 안내 메일 본문을 만든다
 * @description
 * 확장으로 읽으며 메모하기 · 하이라이트 · 웹에서 모아 보기를 한 번씩 짚는 1회성 안내다.
 * 메일 클라이언트마다 CSS 지원이 제각각이라 템플릿 엔진 없이 인라인 스타일만 쓴다.
 */
const buildWelcomeEmailHtml = (name: string | null) => {
  let greeting = "안녕하세요.";

  if (name) {
    greeting = `안녕하세요, ${escapeHtml(name)}님.`;
  }

  const sectionTitleStyle = "margin:24px 0 4px;font-weight:600;";
  const sectionBodyStyle = "margin:0;";

  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Apple SD Gothic Neo\',sans-serif;font-size:15px;line-height:1.7;color:#111;">',
    `<p>${greeting}</p>`,
    "<p>웹 메모에 가입해 주셔서 고마워요. 이렇게 쓰시면 돼요.</p>",
    `<p style="${sectionTitleStyle}">1. 읽으면서 바로 메모하기</p>`,
    `<p style="${sectionBodyStyle}">아티클을 읽거나 유튜브를 보다가 그 자리에서 메모를 남길 수 있어요.<br>크롬 확장을 설치한 뒤, Windows는 Alt + S, macOS는 Option + S로 열어요.<br>확장 설치: <a href="${CHROME_WEB_STORE_URL}">크롬 웹스토어</a></p>`,
    `<p style="${sectionTitleStyle}">2. 하이라이트 남기기</p>`,
    `<p style="${sectionBodyStyle}">다시 보고 싶은 문장을 드래그하면 나오는 버튼으로 하이라이트를 남길 수 있어요.</p>`,
    `<p style="margin-top:24px;">남긴 메모와 하이라이트는 웹에서 모아 볼 수 있어요: <a href="${MEMOS_URL}">${MEMOS_URL}</a></p>`,
    "<p>쓰시다가 불편한 점이 있으면 이 메일에 답장해 주세요. 제가 직접 읽어요.</p>",
    "<p>웹 메모를 만드는 박규성 드림</p>",
    "</div>",
  ].join("");
};

serve(async (req) => {
  // DB 트리거만 부르는 함수다. JWT 검증을 끄고 배포하므로(verify_jwt = false)
  // daily-article-reminder와 같은 공유 비밀 헤더로 호출자를 확인한다.
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ status: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error(
        "RESEND_API_KEY 시크릿이 없습니다. supabase secrets set RESEND_API_KEY=... 로 등록하세요.",
      );
    }

    const triggerPayload = await req.json();
    const record: IFSignedUpUserRecord = triggerPayload.record;

    // Kakao는 이메일 제공에 동의하지 않을 수 있습니다. 보낼 곳이 없는 것은 실패가
    // 아니므로 로그만 남기고 정상 응답합니다.
    if (!record?.email) {
      console.info(`가입 안내 메일 건너뜀 — 이메일 없음, user ${record?.id}`);

      return new Response(JSON.stringify({ status: "skipped" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 제목 헤더에 줄바꿈이 섞이면 메일이 깨지므로 공백으로 편다.
    const recipientName = record.name?.replace(/\s+/g, " ").trim() || null;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [record.email],
        reply_to: REPLY_TO,
        subject: buildWelcomeEmailSubject(recipientName),
        html: buildWelcomeEmailHtml(recipientName),
      }),
    });

    const resendResponseBody = await resendResponse.text();

    if (!resendResponse.ok) {
      throw new Error(
        `Resend 전송 실패 — status ${resendResponse.status}, body ${resendResponseBody}`,
      );
    }

    return new Response(JSON.stringify({ status: "sent" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    console.error("가입 안내 메일 발송 실패:", reason);

    return new Response(JSON.stringify({ status: "error", message: reason }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
