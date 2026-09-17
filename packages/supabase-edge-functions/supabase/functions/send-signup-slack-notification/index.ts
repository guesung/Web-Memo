import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** auth.users 에 새로 생긴 행. INSERT 트리거가 record로 넘겨준다 */
interface IFSignedUpUserRecord {
  id: string;
  created_at: string;
}

/**
 * 신규 가입 알림용 슬랙 메시지를 만든다
 * @description 설계서 범위 밖이라 이메일 등 개인정보는 담지 않는다. UUID와 가입 시각만 싣는다.
 */
const buildSlackMessage = (record: IFSignedUpUserRecord) =>
  [":tada: 신규 가입", `user ${record.id} · ${record.created_at}`].join("\n");

serve(async (req) => {
  // DB 트리거만 부르는 함수다. JWT 검증을 끄고 배포하므로(verify_jwt = false)
  // send-welcome-email과 같은 공유 비밀 헤더로 호출자를 확인한다.
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ status: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const slackWebhookUrl = Deno.env.get("SLACK_SIGNUP_WEBHOOK_URL");

    if (!slackWebhookUrl) {
      throw new Error(
        "SLACK_SIGNUP_WEBHOOK_URL 시크릿이 없습니다. supabase secrets set SLACK_SIGNUP_WEBHOOK_URL=... 로 등록하세요.",
      );
    }

    const triggerPayload = await req.json();
    const record: IFSignedUpUserRecord = triggerPayload.record;

    const slackMessage = buildSlackMessage(record);

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: slackMessage }),
    });

    // Incoming Webhook은 실패해도 사유를 본문(no_service, invalid_payload 등)으로 준다.
    // 상태와 본문을 둘 다 확인한다.
    const slackResponseBody = await slackResponse.text();

    if (!slackResponse.ok || slackResponseBody !== "ok") {
      throw new Error(
        `Slack 전송 실패 — status ${slackResponse.status}, body ${slackResponseBody}`,
      );
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    console.error("신규 가입 Slack 알림 실패:", reason);

    return new Response(JSON.stringify({ status: "error", message: reason }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
