import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { isSecretMatch } from "./secret.ts";
import { parseIngestRequest, type TIngestRequest } from "./validate.ts";

/**
 * 블로그 정주행 카탈로그 수집 전용 엔드포인트.
 * POST /functions/v1/blog-catalog-ingest
 *
 * 호출자는 GitHub Actions의 Node 수집기 하나다. JWT 대신 `x-blog-catalog-ingest-secret` 헤더의
 * 전용 secret(BLOG_CATALOG_INGEST_SECRET)으로 확인하므로 config.toml에서 verify_jwt를 끈다.
 * 기존 SUPABASE_ACCESS_TOKEN(조회 전용)·CRON_SECRET은 쓰지 않는다.
 * 저장은 Supabase가 주입하는 service role로 memo 스키마의 검증 RPC만 부른다.
 *
 * 응답: 성공 200 + RPC 결과(JSON). 실패는 `{ message, code }` 형태로
 * 400(요청 형식) · 401(secret) · 405 · 409(stale lease/세대) · 413 · 422(DB 검증 거절: 종료 증거·개수 불일치 등) · 500.
 */

const MAX_BODY_BYTES = 1024 * 1024;
const MIN_SECRET_LENGTH = 32;

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorResponse = (status: number, message: string, code: string) =>
  jsonResponse(status, { message, code });

/** 검증된 요청을 memo 스키마 RPC 호출로 옮긴다 */
const buildRpcCall = (request: TIngestRequest) => {
  switch (request.action) {
    case "claim":
      return {
        name: "claim_blog_sync",
        args: {
          p_blog_id: request.blogId,
          p_trigger: request.trigger,
          p_force: request.force,
          p_lease_seconds: request.leaseSeconds,
        },
      };
    case "batch":
      return {
        name: "ingest_blog_batch",
        args: {
          p_blog_id: request.blogId,
          p_generation: request.generation,
          p_lease_token: request.leaseToken,
          p_items: request.items,
        },
      };
    case "checkpoint":
      return {
        name: "save_blog_checkpoint",
        args: {
          p_blog_id: request.blogId,
          p_generation: request.generation,
          p_lease_token: request.leaseToken,
          p_checkpoint: request.checkpoint,
        },
      };
    case "finish":
      return {
        name: "finish_blog_sync",
        args: {
          p_blog_id: request.blogId,
          p_generation: request.generation,
          p_lease_token: request.leaseToken,
          p_evidence: request.evidence,
        },
      };
    case "fail":
      return {
        name: "fail_blog_sync",
        args: {
          p_blog_id: request.blogId,
          p_generation: request.generation,
          p_lease_token: request.leaseToken,
          p_error_code: request.errorCode,
          p_checkpoint: request.checkpoint,
          p_keep_checkpoint: request.keepCheckpoint,
        },
      };
  }
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse(405, "POST만 허용됩니다", "method_not_allowed");
  }

  const expectedSecret = Deno.env.get("BLOG_CATALOG_INGEST_SECRET");

  if (!expectedSecret || expectedSecret.length < MIN_SECRET_LENGTH) {
    console.error(
      "BLOG_CATALOG_INGEST_SECRET 시크릿이 없거나 너무 짧습니다. supabase secrets set BLOG_CATALOG_INGEST_SECRET=... 로 32자 이상 값을 등록하세요.",
    );

    return errorResponse(500, "수집 엔드포인트가 설정되지 않았습니다", "not_configured");
  }

  const providedSecret = req.headers.get("x-blog-catalog-ingest-secret");

  if (!(await isSecretMatch(providedSecret, expectedSecret))) {
    return errorResponse(401, "인증에 실패했습니다", "unauthorized");
  }

  const rawBody = await req.text();

  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return errorResponse(413, "요청이 너무 큽니다", "payload_too_large");
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "JSON 형식이 올바르지 않습니다", "malformed_json");
  }

  const parsed = parseIngestRequest(body);

  if (!parsed.ok) {
    return errorResponse(400, parsed.message, "invalid_request");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 주입되지 않았습니다");

    return errorResponse(500, "서버 설정 오류입니다", "not_configured");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "memo" },
  });

  const rpcCall = buildRpcCall(parsed.value);
  const { data, error } = await supabase.rpc(rpcCall.name, rpcCall.args);

  if (error) {
    // DB 함수가 던지는 메시지는 stale_lease · count_mismatch 같은 고정 코드라 그대로 돌려줘도 안전하다.
    if (error.code === "PT409") {
      return errorResponse(409, error.message, "stale_lease");
    }

    if (typeof error.code === "string" && error.code.startsWith("22")) {
      return errorResponse(422, error.message, "rejected");
    }

    console.error(
      `blog-catalog-ingest ${parsed.value.action} ${parsed.value.blogId} 실패 — code ${error.code}, ${error.message}`,
    );

    return errorResponse(500, "저장에 실패했습니다", "internal_error");
  }

  return jsonResponse(200, data ?? {});
});
