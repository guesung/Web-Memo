import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** feedbacks 테이블에 새로 생긴 행. Supabase Database Webhook이 record로 넘겨준다 */
interface IFFeedbackRecord {
  id: string;
  content: string;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

/**
 * 피드백 한 건을 여는 관리자 화면 주소.
 * @description WEB_URL 시크릿이 없으면 링크 줄만 빼고 알림은 그대로 보낸다.
 * 주소를 코드에 박으면 staging과 운영이 같은 곳을 가리키게 되므로 박지 않는다.
 */
const buildAdminLink = (feedbackId: string) => {
  const webUrl = Deno.env.get("WEB_URL");

  if (!webUrl) {
    console.warn(
      "WEB_URL 시크릿이 없어 관리자 링크를 생략합니다. supabase secrets set WEB_URL=... 로 등록하세요.",
    );

    return null;
  }

  return `${webUrl.replace(/\/$/, "")}/ko/admin/feedback?id=${feedbackId}`;
};

/**
 * feedbacks 행 하나를 슬랙에 보낼 메시지로 만든다
 * @description feedbacks.content는 사용자가 헤더 피드백에 쓴 평문이다. 그대로 싣는다.
 * email은 사용자가 직접 적었을 때만 있으므로 있을 때만 회신 줄을 붙인다.
 */
const buildSlackMessage = (record: IFFeedbackRecord) => {
  const writer = record.user_id ?? "비로그인";
  const lines = [
    ":speech_balloon: 새 피드백",
    record.content,
    `작성자 ${writer} · ${record.created_at}`,
  ];

  if (record.email) {
    lines.push(`회신 ${record.email}`);
  }

  const adminLink = buildAdminLink(record.id);

  if (adminLink) {
    lines.push(adminLink);
  }

  return lines.join("\n");
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
