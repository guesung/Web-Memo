import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** auth.users 에 새로 생긴 행. INSERT 트리거가 record로 넘겨준다 */
interface IFSignedUpUserRecord {
  id: string;
  email: string | null;
  created_at: string;
}

const SENDER = "웹 메모 <hello@webmemo.xyz>";
const REPLY_TO = "gueit214@naver.com";
const SUBJECT = "웹 메모에 가입하셨어요. 이제 읽던 자리에서 바로 남길 수 있어요";

const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh";
const IOS_APP_STORE_URL = "https://apps.apple.com/app/id6759237784";
const MEMOS_URL = "https://webmemo.xyz/memos";

/**
 * 가입 안내 메일 본문을 만든다
 * @description
 * 세 진입점(확장·웹·앱)을 한 번씩 짚는 1회성 안내다. 기능을 나열하거나 자랑하지 않는다.
 * 메일 클라이언트마다 CSS 지원이 제각각이라 템플릿 엔진 없이 인라인 스타일만 쓴다.
 */
const buildWelcomeEmailHtml = () => {
  const steps = [
    `<li style="margin-bottom:12px;">먼저 <a href="${CHROME_WEB_STORE_URL}">크롬 확장</a>을 설치해 주세요.</li>`,
    "<li style=\"margin-bottom:12px;\">읽던 페이지에서 사이드 패널을 열면 그 자리에서 메모를 남길 수 있어요.</li>",
    `<li style="margin-bottom:12px;">남긴 메모는 <a href="${MEMOS_URL}">웹</a>과 <a href="${IOS_APP_STORE_URL}">iOS 앱</a>에서 모아 볼 수 있어요.</li>`,
  ].join("");

  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Apple SD Gothic Neo\',sans-serif;font-size:15px;line-height:1.7;color:#111;">',
    "<p>웹 메모에 가입해 주셔서 고마워요.</p>",
    `<ol style="padding-left:20px;">${steps}</ol>`,
    "<p>쓰시다가 불편한 점이 있으면 이 메일에 그대로 답장해 주세요. 저에게 옵니다.</p>",
    "</div>",
  ].join("");
};

serve(async (req) => {
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
        subject: SUBJECT,
        html: buildWelcomeEmailHtml(),
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
