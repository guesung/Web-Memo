import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** feedbacks 테이블에 새로 생긴 행. Supabase Database Webhook이 record로 넘겨준다 */
interface IFFeedbackRecord {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
}

/**
 * feedbacks 행 하나를 슬랙에 보낼 메시지로 만든다
 * @description feedbacks.content는 사용자가 헤더 피드백에 쓴 평문이다. 그대로 싣는다.
 */
const buildSlackMessage = (record: IFFeedbackRecord) => {
  const writer = record.user_id ?? "비로그인";
  const footer = `작성자 ${writer} · ${record.created_at}`;

  return [":speech_balloon: 새 피드백", record.content, footer].join("\n");
};

serve(async (req) => {
  try {
    const slackWebhookUrl = Deno.env.get("SLACK_FEEDBACK_WEBHOOK_URL");

    if (!slackWebhookUrl) {
      throw new Error(
        "SLACK_FEEDBACK_WEBHOOK_URL 시크릿이 없습니다. supabase secrets set SLACK_FEEDBACK_WEBHOOK_URL=... 로 등록하세요.",
      );
    }

    const webhookPayload = await req.json();
    const record: IFFeedbackRecord = webhookPayload.record;

    const slackMessage = buildSlackMessage(record);

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: slackMessage }),
    });

    // Incoming Webhook은 실패해도 사유를 본문(no_service, invalid_payload 등)으로 준다.
    // 이번 장애가 "조용히 끊겨서 아무도 몰랐다"는 형태였으므로 상태와 본문을 둘 다 본다.
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

    console.error("피드백 Slack 알림 실패:", reason);

    return new Response(
      JSON.stringify({ status: "error", message: reason }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
