import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readTokenSecret, verifyUnsubscribeToken } from "../_shared/reportToken.ts";

// 로그인 없이 호출한다(verify_jwt = false). 인증은 메일에 실린 HMAC 토큰이 맡는다.
// 웹 확인 페이지(브라우저)와 메일 클라이언트의 One-Click(RFC 8058)이 호출한다.
// 엣지 함수 기본 도메인은 HTML을 text/plain으로 바꾸므로 확인 화면은 웹이 만들고, 여기는 JSON만 돌려준다.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/**
 * 요청에서 토큰을 꺼낸다. 형태가 틀리면 null
 * (a) JSON `{ token }` (b) One-Click: form body `List-Unsubscribe=One-Click` + 쿼리 `token`
 */
const readToken = async (req: Request): Promise<string | null | "bad_request"> => {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();

      return typeof body?.token === "string" ? body.token : null;
    } catch {
      return "bad_request";
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(await req.text());

    if (form.get("List-Unsubscribe") !== "One-Click") {
      return "bad_request";
    }

    return new URL(req.url).searchParams.get("token");
  }

  return "bad_request";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const secret = readTokenSecret();
    const token = await readToken(req);

    if (token === "bad_request") {
      return jsonResponse({ error: "bad_request" }, 400);
    }

    const userId = verifyUnsubscribeToken(token, secret);

    if (!userId) {
      return jsonResponse({ error: "invalid_token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { db: { schema: "memo" } },
    );
    // 설정 행이 없으면 만들고, 있으면 이 컬럼만 바꾼다. 여러 번 눌러도 결과가 같다
    const { error } = await supabase
      .from("setting")
      .upsert(
        { user_id: userId, weekly_report_enabled: false },
        { onConflict: "user_id" },
      );

    if (error) {
      console.error("수신 거부 저장 실패:", userId, error.message);

      return jsonResponse({ error: "internal_error" }, 500);
    }

    return jsonResponse({ status: "ok" });
  } catch (error) {
    // 토큰·시크릿 값은 로그에 남기지 않는다. 시크릿 미설정 메시지는 원인 파악용으로 남긴다
    console.error("수신 거부 처리 실패:", error instanceof Error ? error.message : error);

    return jsonResponse({ error: "internal_error" }, 500);
  }
});
