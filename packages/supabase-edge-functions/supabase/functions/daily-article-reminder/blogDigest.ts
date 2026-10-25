// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 외부 import 없이 의존성을 주입받는다.
import { getLocalDateString, shouldNotifyNow } from "./timeBucket.ts";

export const DIGEST_BLOG_ID = "geeknews";
const DEFAULT_TIMEZONE = "Asia/Seoul";
/** 묶음 분기를 켜는 Edge Function secret 이름. 정확히 "true"일 때만 켜진다 */
export const BLOG_DIGEST_ENV_NAME = "BLOG_DIGEST_ENABLED";

export interface IFDigestSchedule {
  user_id: string;
  notifyTime: string;
}

export interface IFDigestCandidates {
  count: number;
  latestTitle: string | null;
  since: string | null;
}

export interface IFPushPayload {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface IFDigestDeps {
  /** 이 블로그를 구독 중인 사용자만 돌려준다 */
  fetchSubscribedUserIds: (userIds: string[]) => Promise<Set<string>>;
  /** 사용자 시간대 날짜(sentOn)로 보낸 묶음 이력이 있는지 */
  hasDigestSentOn: (userId: string, sentOn: string) => Promise<boolean>;
  fetchCandidates: (userId: string) => Promise<IFDigestCandidates>;
  fetchTokens: (userId: string) => Promise<{ token: string }[]>;
  sendPush: (tokens: { token: string }[], payload: IFPushPayload) => Promise<boolean>;
  /** 이미 같은 날 이력이 있어 unique 위반이면 조용히 끝나고, 그 외 실패는 throw한다 */
  insertLog: (log: { userId: string; sentOn: string; articleCount: number }) => Promise<void>;
  logError: (message: string, ...details: unknown[]) => void;
}

export interface IFDigestResult {
  notified: number;
  skipped: number;
  failed: number;
}

export const isBlogDigestEnabled = (value: string | undefined | null) =>
  value === "true";

export const buildDigestPayload = (
  count: number,
  latestTitle: string | null,
): IFPushPayload => ({
  title: `긱뉴스 새 글 ${count}개`,
  body: latestTitle ?? "",
  // data.url을 넣지 않는다. 구버전 앱은 url이 있어야 화면을 열므로 이 알림을 무시한다
  data: { type: "blog_digest", blogId: DIGEST_BLOG_ID },
});

/**
 * 긱뉴스 새 글 묶음 알림 분기. 위시 리마인더와 별개로 같은 시각 버킷에서 돈다.
 * 발송 성공 후에만 이력을 남기므로 실패하면 같은 날 다음 버킷에서 다시 시도된다.
 */
export const runBlogDigest = async (
  options: {
    enabled: boolean;
    now: Date;
    schedules: IFDigestSchedule[];
    timezones: Map<string, string>;
  },
  deps: IFDigestDeps,
): Promise<IFDigestResult | null> => {
  if (!options.enabled) {
    return null;
  }

  const result: IFDigestResult = { notified: 0, skipped: 0, failed: 0 };
  const timezoneOf = (userId: string) =>
    options.timezones.get(userId) ?? DEFAULT_TIMEZONE;

  // 사용자당 한 번만 본다. 같은 버킷에 켜진 시각이 여럿이어도 하루 한 번이다.
  const dueUserIds = new Set<string>();

  for (const schedule of options.schedules) {
    try {
      if (shouldNotifyNow(schedule.notifyTime, timezoneOf(schedule.user_id), options.now)) {
        dueUserIds.add(schedule.user_id);
      }
    } catch (error) {
      deps.logError("묶음 timezone 판정 실패:", schedule.user_id, error);
      result.failed++;
    }
  }

  if (dueUserIds.size === 0) {
    return result;
  }

  const subscribed = await deps.fetchSubscribedUserIds([...dueUserIds]);

  for (const userId of dueUserIds) {
    if (!subscribed.has(userId)) {
      result.skipped++;
      continue;
    }

    try {
      const sentOn = getLocalDateString(options.now, timezoneOf(userId));

      if (await deps.hasDigestSentOn(userId, sentOn)) {
        result.skipped++;
        continue;
      }

      const candidates = await deps.fetchCandidates(userId);

      if (candidates.count < 1) {
        result.skipped++;
        continue;
      }

      const tokens = await deps.fetchTokens(userId);

      if (tokens.length === 0) {
        result.skipped++;
        continue;
      }

      const isSent = await deps.sendPush(
        tokens,
        buildDigestPayload(candidates.count, candidates.latestTitle),
      );

      if (!isSent) {
        result.failed++;
        continue;
      }

      result.notified++;

      try {
        await deps.insertLog({ userId, sentOn, articleCount: candidates.count });
      } catch (error) {
        deps.logError("묶음 발송 로그 기록 실패:", userId, error);
        result.failed++;
      }
    } catch (error) {
      deps.logError("묶음 알림 발송 실패:", userId, error);
      result.failed++;
    }
  }

  return result;
};
