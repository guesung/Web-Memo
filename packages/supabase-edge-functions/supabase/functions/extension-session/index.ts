import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 크롬 확장 전용 세션 발급 엔드포인트.
 * POST /functions/v1/extension-session
 *
 * 확장이 웹 세션과 refresh token 계열을 공유하면 한쪽이 토큰을 회전시킬 때
 * 다른 쪽이 이미 쓴 토큰을 보내 세션 전체가 폐기된다. 그래서 확장은 웹 세션의
 * access token으로 이 함수를 불러 웹과 별개인 새 세션의 재료(hashed_token)를 받는다.
 * 확장은 이를 `verifyOtp({ token_hash, type: "magiclink" })`로 교환한다.
 *
 * 요청: 헤더 `Authorization: Bearer <사용자 access token>`, 본문 없음.
 * 응답:
 *  - 200 `{ token_hash }`
 *  - 401 `{ error: "invalid_token" }` — 헤더 없음 / 토큰 검증 실패
 *  - 405 — POST 외 메서드
 *  - 422 `{ error: "email_required" }` — 사용자에게 이메일이 없음
 *  - 500 `{ error: "mint_failed" }`
 * 이메일·토큰·원인 메시지는 응답과 로그에 남기지 않는다(고정 코드만 로그).
 * JWT 검증은 게이트웨이(verify_jwt = true)가 먼저 하고, 여기서 getUser로 한 번 더 확인한다.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const extractBearerToken = (header: string | null) => {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const accessToken = extractBearerToken(req.headers.get("Authorization"));
  if (!accessToken) {
    return jsonResponse(401, { error: "invalid_token" });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return jsonResponse(401, { error: "invalid_token" });
    }

    const email = userData.user.email;
    if (!email) {
      return jsonResponse(422, { error: "email_required" });
    }

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error("extension-session: mint_failed");
      return jsonResponse(500, { error: "mint_failed" });
    }

    return jsonResponse(200, { token_hash: tokenHash });
  } catch {
    console.error("extension-session: mint_failed");
    return jsonResponse(500, { error: "mint_failed" });
  }
});
