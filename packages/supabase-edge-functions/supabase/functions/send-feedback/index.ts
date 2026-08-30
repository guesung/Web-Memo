import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** 언인스톨 폼이 feedbacks.content에 JSON 문자열로 넣는 값 */
interface IFUninstallFeedbackContent {
  type: "uninstall";
  reason: string;
  feedback: string;
  phoneNumber: string | null;
  timestamp: string;
}

/** feedbacks 테이블에 새로 생긴 행. Supabase Database Webhook이 record로 넘겨준다 */
interface IFFeedbackRecord {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
}

// feedbacks 테이블에는 인입 경로가 셋이다. 헤더 피드백은 사용자가 쓴 평문이고,
// 언인스톨 폼은 type이 uninstall인 JSON, 언인스톨 페이지 방문 로그는
// type이 uninstall_page_visit인 JSON이다. 평문은 파싱에 실패하는 것이 정상 경로다.
const parseFeedbackContent = (content: string) => {
  try {
    return JSON.parse(content);
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

// 알리지 않을 행은 null을 돌려준다. 방문 로그는 사용자가 남긴 말이 아니라 지표라
// 피드백 채널에 섞이면 진짜 피드백이 묻힌다.
const buildSlackMessage = (record: IFFeedbackRecord) => {
  const parsedContent = parseFeedbackContent(record.content);

  if (parsedContent?.type === "uninstall_page_visit") {
    return null;
  }

  const writer = record.user_id ?? "비로그인";
  const footer = `작성자 ${writer} · ${record.created_at}`;

  if (parsedContent?.type !== "uninstall") {
    return [":speech_balloon: 새 피드백 (일반)", record.content, footer].join("\n");
  }

  const uninstallContent = parsedContent as IFUninstallFeedbackContent;
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
    const record: IFFeedbackRecord = webhookPayload.record;

    const slackMessage = buildSlackMessage(record);

    if (slackMessage === null) {
      return new Response(JSON.stringify({ status: "skipped" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

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
