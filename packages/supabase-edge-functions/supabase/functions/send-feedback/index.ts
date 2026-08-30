import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface UninstallFeedbackContent {
  type: "uninstall";
  reason: string;
  feedback: string;
  phoneNumber: string | null;
  timestamp: string;
}

interface FeedbackRecord {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
}

// 언인스톨 폼만 content를 JSON으로 넣는다. 헤더 피드백은 사용자가 쓴 평문이라
// 파싱 실패가 오류가 아니라 정상 경로다.
const parseUninstallContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);

    if (parsed?.type === "uninstall") {
      return parsed as UninstallFeedbackContent;
    }

    return null;
  } catch {
    return null;
  }
};

// 채널 메시지는 오래 남고 여러 사람이 보므로 원본 번호를 싣지 않는다.
// 실제로 연락할 일이 생기면 DB에서 조회한다.
const maskPhoneNumber = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.length < 7) {
    return "***";
  }

  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
};

const buildSlackMessage = (record: FeedbackRecord) => {
  const uninstallContent = parseUninstallContent(record.content);
  const writer = record.user_id ?? "비로그인";
  const footer = `작성자 ${writer} · ${record.created_at}`;

  if (uninstallContent === null) {
    return [":speech_balloon: 새 피드백 (일반)", record.content, footer].join("\n");
  }

  const phoneNumber = uninstallContent.phoneNumber
    ? maskPhoneNumber(uninstallContent.phoneNumber)
    : "없음";

  return [
    ":wave: 새 피드백 (언인스톨)",
    `사유: ${uninstallContent.reason || "없음"}`,
    `내용: ${uninstallContent.feedback || "없음"}`,
    `연락처: ${phoneNumber}`,
    footer,
  ].join("\n");
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
    const record: FeedbackRecord = webhookPayload.record;

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: buildSlackMessage(record) }),
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
    console.error("피드백 Slack 알림 실패:", error.message);

    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
