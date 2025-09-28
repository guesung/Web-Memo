import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  // 1. Supabase 웹훅 페이로드 파싱
  const webhookPayload = await req.json();

  // 'record' 객체에서 추가된 데이터의 값을 추출합니다.
  // 예시: 'id'와 'name' 필드를 추출
  const newRecord = webhookPayload.record;
  const dataId = newRecord.id;
  const dataName = newRecord.name;

  // 2. 추출한 데이터를 포함하여 새로운 URL을 생성합니다.
  const targetUrl = new URL("https://pbix60v3vk.execute-api.ap-northeast-2.amazonaws.com/send-feedback");
  targetUrl.searchParams.append("id", dataId);
  targetUrl.searchParams.append("name", dataName);

  console.log("새로운 URL:", targetUrl.toString());

  try {
    // 3. 재구성된 URL로 HTTP GET 요청을 보냅니다.
    const response = await fetch(targetUrl.toString(), {
      method: "GET", // URL로 데이터를 전달하므로 GET 메소드를 사용
    });

    const result = await response.json();
    console.log("외부 서비스 응답:", result);

    return new Response(JSON.stringify({ status: "success", data: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch 요청 중 오류 발생:", error);
    return new Response(JSON.stringify({ status: "error", message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});