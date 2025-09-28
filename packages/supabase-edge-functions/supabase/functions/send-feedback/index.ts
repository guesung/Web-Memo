import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GATE_API_URL = "https://pbix60v3vk.execute-api.ap-northeast-2.amazonaws.com/send-feedback"

serve(async (req) => {
  const webhookPayload = await req.json();

  const newRecord = webhookPayload.record;
  const content = newRecord.content;

  const targetUrl = new URL(GATE_API_URL);
  targetUrl.searchParams.append("content", content);

  console.log("Gate API URL:", targetUrl.toString());

  try {
    const response = await fetch(targetUrl.toString(), {
      method: "GET",
    });

    const result = await response.json();
    console.log("Gate API 응답:", result);

    return new Response(JSON.stringify({ status: "success", data: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gate API 요청 중 오류 발생:", error);
    return new Response(JSON.stringify({ status: "error", message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});