import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLocalDateString, shouldNotifyNow } from "./timeBucket.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DEFAULT_TIMEZONE = "Asia/Seoul";
/** 후보 글을 찾을 때 한 번에 읽는 위시 메모 수. `in` 조회 URL이 길어지지 않게 묶는다 */
const MEMO_PAGE_SIZE = 50;
/** `in` 조회에 넣는 user_id 개수 상한 */
const USER_CHUNK_SIZE = 100;
/** 오늘 발송 여부를 볼 로그 조회 범위. 어느 타임존이든 "오늘"을 포함하도록 여유를 둔다 */
const RECENT_LOG_HOURS = 48;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { db: { schema: "memo" } },
);

interface IFNotificationSchedule {
  user_id: string;
  notifyTime: string;
}

interface IFCandidateMemo {
  id: number;
  title: string;
  url: string;
}

interface IFRecentLog {
  user_id: string;
  notifyTime: string | null;
  sent_at: string;
}

/**
 * JSON 응답을 만든다
 */
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * 배열을 size 개씩 나눈다
 */
const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

/**
 * "08:00:00"과 "08:00"을 같은 값("08:00")으로 맞춘다
 */
const toHourMinute = (time: string) => time.slice(0, 5);

/**
 * 유저의 위시리스트(삭제되지 않은 것) 중 발송 이력이 없는 가장 오래된 메모 1건을 고른다.
 * @description 발송된 id를 모두 모아 NOT IN 하면 이력이 늘 때 URL 길이·행 수 제한에 걸린다.
 * 그래서 오래된 순으로 MEMO_PAGE_SIZE개씩 읽고, 그 묶음에 한해서만 이력을 조회한다.
 */
const pickCandidateMemo = async (
  userId: string,
): Promise<IFCandidateMemo | null> => {
  for (let offset = 0; ; offset += MEMO_PAGE_SIZE) {
    const { data: memos, error: memoError } = await supabase
      .from("memo")
      .select("id, title, url")
      .eq("user_id", userId)
      .eq("isWish", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + MEMO_PAGE_SIZE - 1);

    if (memoError) {
      throw new Error(`후보 메모 조회 실패: ${memoError.message}`);
    }

    if (!memos || memos.length === 0) {
      return null;
    }

    const { data: sentLogs, error: logError } = await supabase
      .from("notification_log")
      .select("memo_id")
      .eq("user_id", userId)
      .in(
        "memo_id",
        memos.map((memo) => memo.id),
      );

    if (logError) {
      throw new Error(`발송 이력 조회 실패: ${logError.message}`);
    }

    const sentMemoIds = new Set((sentLogs ?? []).map((log) => log.memo_id));
    const candidate = memos.find((memo) => !sentMemoIds.has(memo.id));

    if (candidate) {
      return candidate;
    }

    if (memos.length < MEMO_PAGE_SIZE) {
      return null;
    }
  }
};

/**
 * Expo Push API로 알림을 보내고, 죽은 토큰(DeviceNotRegistered)을 정리한다.
 * 하나 이상의 토큰으로 발송 성공하면 true.
 */
const sendPush = async (
  tokens: { token: string }[],
  memo: IFCandidateMemo,
): Promise<boolean> => {
  const messages = tokens.map(({ token }) => ({
    to: token,
    title: "오늘 읽을 글",
    body: memo.title,
    data: { url: memo.url, memoId: memo.id },
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error(
      "Expo Push API 오류:",
      response.status,
      await response.text(),
    );

    return false;
  }

  const { data: tickets } = await response.json();
  let hasSuccess = false;

  for (let index = 0; index < tickets.length; index++) {
    const ticket = tickets[index];

    if (ticket.status === "ok") {
      hasSuccess = true;
      continue;
    }

    if (ticket.details?.error === "DeviceNotRegistered") {
      const { error } = await supabase
        .from("push_token")
        .delete()
        .eq("token", tokens[index].token);

      if (error) {
        console.error("죽은 토큰 삭제 실패:", error.message);
      }
    }

    console.error("푸시 티켓 오류:", JSON.stringify(ticket));
  }

  return hasSuccess;
};

/**
 * 유저별 timezone을 읽는다. 설정 행이 없으면 호출 쪽에서 기본값을 쓴다.
 */
const fetchTimezones = async (userIds: string[]) => {
  const timezones = new Map<string, string>();

  for (const userIdChunk of chunk(userIds, USER_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("notification_setting")
      .select("user_id, timezone")
      .in("user_id", userIdChunk);

    if (error) {
      throw new Error(`timezone 조회 실패: ${error.message}`);
    }

    for (const row of data ?? []) {
      timezones.set(row.user_id, row.timezone);
    }
  }

  return timezones;
};

/**
 * 최근 발송 이력(알림 시각이 기록된 것만)을 유저별로 모은다.
 */
const fetchRecentLogs = async (userIds: string[], now: Date) => {
  const since = new Date(
    now.getTime() - RECENT_LOG_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const logsByUser = new Map<string, IFRecentLog[]>();

  for (const userIdChunk of chunk(userIds, USER_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("notification_log")
      .select("user_id, notifyTime, sent_at")
      .in("user_id", userIdChunk)
      .not("notifyTime", "is", null)
      .gte("sent_at", since);

    if (error) {
      throw new Error(`발송 이력 조회 실패: ${error.message}`);
    }

    for (const log of (data ?? []) as IFRecentLog[]) {
      logsByUser.set(log.user_id, [...(logsByUser.get(log.user_id) ?? []), log]);
    }
  }

  return logsByUser;
};

serve(async (req) => {
  // pg_cron만 부르는 함수다. JWT 검증을 끄고 배포하므로(verify_jwt = false)
  // 공유 비밀 헤더로 호출자를 확인한다. 시크릿이 비어 있으면 헤더 비교 전에 막는다.
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ status: "unauthorized" }, 401);
  }

  try {
    const now = new Date();
    let notified = 0;
    let skipped = 0;
    let failed = 0;

    const { data: schedules, error: scheduleError } = await supabase
      .from("notification_schedule")
      .select("user_id, notifyTime")
      .eq("isEnabled", true);

    if (scheduleError) {
      throw new Error(`알림 시각 조회 실패: ${scheduleError.message}`);
    }

    const userIds = [
      ...new Set(
        ((schedules ?? []) as IFNotificationSchedule[]).map(
          (schedule) => schedule.user_id,
        ),
      ),
    ];
    const timezones = await fetchTimezones(userIds);

    const dueSchedules = ((schedules ?? []) as IFNotificationSchedule[]).filter(
      (schedule) => {
        const timezone = timezones.get(schedule.user_id) ?? DEFAULT_TIMEZONE;

        try {
          return shouldNotifyNow(schedule.notifyTime, timezone, now);
        } catch (error) {
          // 잘못된 timezone 값 하나가 전체 발송을 막지 않게 그 행만 건너뛴다
          console.error("timezone 판정 실패:", schedule.user_id, timezone, error);
          failed++;

          return false;
        }
      },
    );

    const dueUserIds = [
      ...new Set(dueSchedules.map((schedule) => schedule.user_id)),
    ];
    const recentLogs = await fetchRecentLogs(dueUserIds, now);
    const tokensByUser = new Map<string, { token: string }[]>();

    for (const schedule of dueSchedules) {
      try {
        const timezone = timezones.get(schedule.user_id) ?? DEFAULT_TIMEZONE;
        const today = getLocalDateString(now, timezone);
        const notifyTime = toHourMinute(schedule.notifyTime);

        const hasSentToday = (recentLogs.get(schedule.user_id) ?? []).some(
          (log) =>
            log.notifyTime !== null &&
            toHourMinute(log.notifyTime) === notifyTime &&
            getLocalDateString(new Date(log.sent_at), timezone) === today,
        );

        if (hasSentToday) {
          skipped++;
          continue;
        }

        const memo = await pickCandidateMemo(schedule.user_id);

        if (!memo) {
          skipped++;
          continue;
        }

        if (!tokensByUser.has(schedule.user_id)) {
          const { data: tokens, error: tokenError } = await supabase
            .from("push_token")
            .select("token")
            .eq("user_id", schedule.user_id);

          if (tokenError) {
            throw new Error(`푸시 토큰 조회 실패: ${tokenError.message}`);
          }

          tokensByUser.set(schedule.user_id, tokens ?? []);
        }

        const tokens = tokensByUser.get(schedule.user_id) ?? [];

        if (tokens.length === 0) {
          skipped++;
          continue;
        }

        const isSent = await sendPush(tokens, memo);

        if (!isSent) {
          failed++;
          continue;
        }

        // 발송 성공 후에만 로그를 남긴다. UNIQUE(user_id, memo_id) 충돌은 이미
        // 발송된 글이라는 뜻이므로 무시한다.
        const { error: logError } = await supabase
          .from("notification_log")
          .insert({
            user_id: schedule.user_id,
            memo_id: memo.id,
            notifyTime: schedule.notifyTime,
          });

        if (logError && logError.code !== "23505") {
          console.error("발송 로그 기록 실패:", logError.message);
          failed++;
        }

        notified++;
      } catch (error) {
        // 한 유저·시각의 실패가 나머지 발송을 막지 않게 한다
        console.error("리마인더 발송 실패:", schedule.user_id, error);
        failed++;
      }
    }

    return jsonResponse({ status: "success", notified, skipped, failed });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    console.error("리마인더 실행 실패:", reason);

    return jsonResponse({ status: "error", message: reason }, 500);
  }
});
