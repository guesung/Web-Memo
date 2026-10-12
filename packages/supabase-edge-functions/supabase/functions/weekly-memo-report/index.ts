import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildWeeklyReportHtml,
  buildWeeklyReportSubject,
  type IFReportMemo,
} from "./template.ts";
import { getWeekRange } from "./weekRange.ts";

const SENDER = "웹 메모 <hello@webmemo.xyz>";
const REPLY_TO = "gueit214@naver.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 테스트 메일 연타 방지 간격 */
const TEST_RATE_LIMIT_SECONDS = 60;
/** 이번 주 메모 작성자를 찾을 때 한 번에 읽는 메모 수 */
const MEMO_PAGE_SIZE = 1000;
/** `in` 조회 URL이 길어지지 않게 묶는 user_id 개수 */
const USER_CHUNK_SIZE = 100;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { db: { schema: "memo" } },
);

// 브라우저(supabase.functions.invoke)에서 테스트 모드를 부르므로 CORS 헤더가 필요하다
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IFSettingRow {
  user_id: string;
  weekly_report_enabled: boolean;
  weekly_report_email: string | null;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const isValidEmail = (email: string | null | undefined): email is string =>
  Boolean(email) && EMAIL_PATTERN.test(email as string);

/**
 * 주 시작(월 00:00 KST)부터 rangeEnd까지의 메모를 최신순으로 전부 읽는다
 * @description 본문 없이 페이지만 저장한 것과 위시리스트는 회고할 내용이 없어 뺀다
 */
const fetchWeekMemos = async (
  userId: string,
  weekStartUtc: Date,
  rangeEnd: Date,
) => {
  const { data, error } = await supabase
    .from("memo")
    .select("title, url, memo, created_at")
    .eq("user_id", userId)
    .gte("created_at", weekStartUtc.toISOString())
    .lte("created_at", rangeEnd.toISOString())
    .is("deleted_at", null)
    .not("isWish", "is", true)
    .filter("memo", "match", "\\S")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`이번 주 메모 조회 실패: ${error.message}`);
  }

  const memos = (data ?? []) as IFReportMemo[];

  return { memos, total: memos.length };
};

/**
 * Resend로 리포트 메일을 보낸다. 실패하면 throw한다.
 */
const sendReportEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    throw new Error(
      "RESEND_API_KEY 시크릿이 없습니다. supabase secrets set RESEND_API_KEY=... 로 등록하세요.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: SENDER,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Resend 전송 실패 — status ${response.status}, body ${await response.text()}`,
    );
  }
};

/**
 * 발송 결과를 기록한다. 기록 실패는 호출 쪽이 판단할 수 있게 error 코드를 돌려준다
 */
const insertLog = async (log: {
  user_id: string;
  week_start: string;
  email: string;
  is_test: boolean;
  status: "sent" | "failed";
}) => {
  const { error } = await supabase.from("weekly_report_log").insert(log);

  return error;
};

/**
 * 이번 주 정기 발송이 이미 성공한 사용자 id 집합
 */
const fetchAlreadySentUserIds = async (userIds: string[], weekStart: string) => {
  const sentUserIds = new Set<string>();

  for (const userIdChunk of chunk(userIds, USER_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("weekly_report_log")
      .select("user_id")
      .eq("week_start", weekStart)
      .eq("is_test", false)
      .eq("status", "sent")
      .in("user_id", userIdChunk);

    if (error) {
      throw new Error(`발송 기록 조회 실패: ${error.message}`);
    }

    for (const row of data ?? []) {
      sentUserIds.add(row.user_id);
    }
  }

  return sentUserIds;
};

/**
 * 기간 안에 본문 있는 메모를 쓴 사용자 id 목록
 * @description 리포트는 기본으로 켜져 있어 설정 행이 없는 사용자도 대상이다. 메모가 없는 주엔
 * 보내지 않으므로 메모 작성자부터 찾는다
 */
const fetchWeekAuthorIds = async (weekStartUtc: Date, rangeEnd: Date) => {
  const authorIds = new Set<string>();

  for (let offset = 0; ; offset += MEMO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("memo")
      .select("user_id")
      .gte("created_at", weekStartUtc.toISOString())
      .lte("created_at", rangeEnd.toISOString())
      .is("deleted_at", null)
      .not("isWish", "is", true)
      .not("user_id", "is", null)
      .filter("memo", "match", "\\S")
      .order("id", { ascending: true })
      .range(offset, offset + MEMO_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`이번 주 메모 작성자 조회 실패: ${error.message}`);
    }

    for (const row of data ?? []) {
      authorIds.add(row.user_id);
    }

    if (!data || data.length < MEMO_PAGE_SIZE) {
      return [...authorIds];
    }
  }
};

/**
 * 사용자별 리포트 설정. 사용자당 행이 둘 이상이면 가장 먼저 만든 행을 쓴다
 */
const fetchSettingsByUserId = async (userIds: string[]) => {
  const settings = new Map<string, IFSettingRow>();

  for (const userIdChunk of chunk(userIds, USER_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("setting")
      .select("user_id, weekly_report_enabled, weekly_report_email")
      .in("user_id", userIdChunk)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`리포트 설정 조회 실패: ${error.message}`);
    }

    for (const row of (data ?? []) as IFSettingRow[]) {
      if (!settings.has(row.user_id)) {
        settings.set(row.user_id, row);
      }
    }
  }

  return settings;
};

/**
 * 받을 주소. 설정에 넣은 주소가 없으면 로그인 이메일로 보낸다
 */
const resolveReportEmail = async (
  userId: string,
  settingEmail: string | null | undefined,
) => {
  const trimmed = settingEmail?.trim();

  if (isValidEmail(trimmed)) {
    return trimmed;
  }

  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(`로그인 이메일 조회 실패: ${error.message}`);
  }

  const loginEmail = data.user?.email?.trim();

  return isValidEmail(loginEmail) ? loginEmail : null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_START_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface IFRegularOptions {
  /** 지난 주를 다시 보낼 때 그 주의 KST 월요일(YYYY-MM-DD). 없으면 이번 주 */
  weekStart?: string;
  /** 한 사용자에게만 보낼 때의 user_id. 없으면 대상 전원 */
  userId?: string;
}

/**
 * 정기 모드: 이번 주 메모를 쓴 사용자 중 리포트를 끄지 않은 사람에게 보낸다
 * @description 수동 재발송용으로 weekStart·userId를 받으면 그 주 전체를 그 사용자에게만 보낸다
 */
const runRegular = async (options: IFRegularOptions = {}) => {
  const now = new Date();
  const baseDate = WEEK_START_PATTERN.test(options.weekStart ?? "")
    ? new Date(`${options.weekStart}T00:00:00+09:00`)
    : now;
  const { weekStartUtc, weekStart, rangeLabel } = getWeekRange(baseDate);
  const rangeEnd = new Date(
    Math.min(now.getTime(), weekStartUtc.getTime() + WEEK_MS - 1),
  );
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const userIds = (await fetchWeekAuthorIds(weekStartUtc, rangeEnd)).filter(
    (userId) => !options.userId || userId === options.userId,
  );
  const settings = await fetchSettingsByUserId(userIds);
  const alreadySentUserIds = await fetchAlreadySentUserIds(userIds, weekStart);

  for (const userId of userIds) {
    try {
      const setting = settings.get(userId);

      // 설정 행이 없으면 기본값(켜짐)으로 본다. 직접 끈 사람만 뺀다
      if (setting?.weekly_report_enabled === false || alreadySentUserIds.has(userId)) {
        skipped++;
        continue;
      }

      const email = await resolveReportEmail(userId, setting?.weekly_report_email);

      if (!email) {
        skipped++;
        continue;
      }

      const { memos, total } = await fetchWeekMemos(
        userId,
        weekStartUtc,
        rangeEnd,
      );

      if (total === 0) {
        skipped++;
        continue;
      }

      try {
        await sendReportEmail({
          to: email,
          subject: buildWeeklyReportSubject({ count: total, isTest: false }),
          html: buildWeeklyReportHtml({ memos, total, rangeLabel, isTest: false }),
        });
      } catch (error) {
        console.error("주간 리포트 발송 실패:", userId, error);
        failed++;

        const failedLogError = await insertLog({
          user_id: userId,
          week_start: weekStart,
          email,
          is_test: false,
          status: "failed",
        });

        if (failedLogError) {
          console.error("실패 기록 저장 실패:", userId, failedLogError.message);
        }

        continue;
      }

      const logError = await insertLog({
        user_id: userId,
        week_start: weekStart,
        email,
        is_test: false,
        status: "sent",
      });

      // UNIQUE 충돌은 같은 주 발송이 동시에 끝났다는 뜻이다. 중복 집계하지 않는다
      if (logError?.code === "23505") {
        skipped++;
        continue;
      }

      if (logError) {
        // 메일은 나갔지만 기록이 없다. 재실행 시 중복 발송될 수 있으므로 반드시 드러낸다
        console.error("발송 기록 저장 실패:", userId, logError.message);
      }

      sent++;
    } catch (error) {
      // 한 사용자의 실패가 나머지 발송을 막지 않게 한다
      console.error("주간 리포트 처리 실패:", userId, error);
      failed++;
    }
  }

  return jsonResponse({ status: "ok", sent, skipped, failed });
};

/**
 * 테스트 모드: 로그인한 사용자 본인의 설정 주소로 `[테스트]` 메일을 보낸다
 */
const runTest = async (req: Request) => {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
  const { data: userData, error: userError } =
    await authClient.auth.getUser(token);

  if (userError || !userData.user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const userId = userData.user.id;
  const now = new Date();
  const { weekStartUtc, weekStart, rangeLabel } = getWeekRange(now);

  const since = new Date(
    now.getTime() - TEST_RATE_LIMIT_SECONDS * 1000,
  ).toISOString();
  const { data: recentLogs, error: recentError } = await supabase
    .from("weekly_report_log")
    .select("id")
    .eq("user_id", userId)
    .eq("is_test", true)
    .gte("created_at", since)
    .limit(1);

  if (recentError) {
    throw new Error(`테스트 발송 기록 조회 실패: ${recentError.message}`);
  }

  if ((recentLogs ?? []).length > 0) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const { data: setting, error: settingError } = await supabase
    .from("setting")
    .select("weekly_report_email")
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (settingError) {
    throw new Error(`리포트 설정 조회 실패: ${settingError.message}`);
  }

  const settingEmail = setting?.weekly_report_email?.trim();
  const loginEmail = userData.user.email?.trim();
  const email = isValidEmail(settingEmail) ? settingEmail : loginEmail;

  if (!isValidEmail(email)) {
    return jsonResponse({ error: "invalid_email" }, 400);
  }

  const { memos, total } = await fetchWeekMemos(userId, weekStartUtc, now);

  try {
    await sendReportEmail({
      to: email,
      subject: buildWeeklyReportSubject({ count: total, isTest: true }),
      html: buildWeeklyReportHtml({ memos, total, rangeLabel, isTest: true }),
    });
  } catch (error) {
    console.error("테스트 리포트 발송 실패:", userId, error);

    const failedLogError = await insertLog({
      user_id: userId,
      week_start: weekStart,
      email,
      is_test: true,
      status: "failed",
    });

    if (failedLogError) {
      console.error("실패 기록 저장 실패:", userId, failedLogError.message);
    }

    return jsonResponse({ error: "send_failed" }, 502);
  }

  const logError = await insertLog({
    user_id: userId,
    week_start: weekStart,
    email,
    is_test: true,
    status: "sent",
  });

  if (logError) {
    console.error("테스트 발송 기록 저장 실패:", userId, logError.message);
  }

  return jsonResponse({ status: "ok", email });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    let body: { mode?: string } & IFRegularOptions = {};

    try {
      body = await req.json();
    } catch {
      // pg_cron은 '{}'를 보내지만, 본문이 비어 있어도 정기 모드로 본다
    }

    if (body?.mode === "test") {
      return await runTest(req);
    }

    // 정기 모드는 pg_cron만 부른다. JWT 검증을 끄고 배포하므로(verify_jwt = false)
    // 공유 비밀 헤더로 호출자를 확인한다. 시크릿이 비어 있으면 헤더 비교 전에 막는다.
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return jsonResponse({ status: "unauthorized" }, 401);
    }

    return await runRegular({ weekStart: body?.weekStart, userId: body?.userId });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    console.error("주간 리포트 실행 실패:", reason);

    return jsonResponse({ status: "error", message: "internal_error" }, 500);
  }
});
