import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readTokenSecret, verifyClickToken } from "../_shared/reportToken.ts";
import { isWebUrlDestination, readWebUrl } from "../_shared/webUrl.ts";

// 메일 링크를 눌렀을 때 거치는 함수(verify_jwt = false). 클릭을 기록하고 목적지로 302한다.
// 서명이 틀리거나 목적지가 웹 도메인이 아니면 기록 없이 웹 홈으로 보낸다 — 오픈 리다이렉트 금지.
// 기록이 실패해도 사용자는 목적지로 보낸다(메일 링크가 죽으면 안 된다).
const redirect = (location: string) =>
  new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  const webUrl = readWebUrl();

  // 메일 보안 스캐너 등이 보내는 HEAD·기타 메서드는 기록하지 않는다
  if (req.method !== "GET") {
    return redirect(webUrl);
  }

  let secret: string;

  try {
    secret = readTokenSecret();
  } catch (error) {
    console.error("클릭 토큰 시크릿 오류:", error instanceof Error ? error.message : error);

    return redirect(webUrl);
  }

  const payload = verifyClickToken(new URL(req.url).searchParams.get("t"), secret);

  if (!payload || !isWebUrlDestination(payload.destination, webUrl)) {
    return redirect(webUrl);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { db: { schema: "memo" } },
    );
    const { error } = await supabase.from("weekly_report_click").insert({
      user_id: payload.userId,
      week_start: payload.weekStart,
      kind: payload.kind,
      position: payload.position,
    });

    if (error) {
      console.error("클릭 기록 저장 실패:", payload.userId, error.message);
    }
  } catch (error) {
    console.error("클릭 기록 처리 실패:", payload.userId, error instanceof Error ? error.message : error);
  }

  return redirect(payload.destination);
});
