// resurface(이번 주 안 쓴 사람에게 예전 메모 보내기)의 순수 함수 모음.
// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 외부 import 없이 쓴다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 하루에 보내는 resurface 상한. Resend 무료 플랜 하루 100통에서 report·환영 메일 몫을 남긴다 */
export const RESURFACE_DAILY_CAP = 85;
/** 한 통에 담는 메모 최대 수 */
export const RESURFACE_MAX_MEMOS = 3;
/** 만든 지 이 일수가 넘은 메모만 "예전 메모"로 본다 */
export const RESURFACE_MIN_AGE_DAYS = 14;
/** 1년·6개월·1개월 전 같은 날에서 허용하는 오차(일) */
const ANNIVERSARY_TOLERANCE_DAYS = 3;
const ANNIVERSARY_MONTHS_AGO = [12, 6, 1];

export interface IFResurfaceCandidate {
  id: number;
  created_at: string;
}

/** FNV-1a 32비트 해시에 murmur3 마무리 섞기를 더해 최상위 비트까지 고르게 만든다 */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return hash >>> 0;
};

/**
 * 대조군 여부. user_id만으로 정해 주가 바뀌어도 같은 사람은 늘 같은 그룹이다
 */
export const isHoldoutUser = (userId: string): boolean =>
  hashString(userId) >>> 31 === 1;

/** 시드 고정 난수(mulberry32). 같은 시드는 같은 수열 */
const createSeededRandom = (seed: string) => {
  let state = hashString(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/** 입력 순서와 무관하게 시드가 같으면 같은 순서가 나오는 셔플 */
const seededShuffle = <T extends { id: number }>(items: T[], seed: string) => {
  const shuffled = [...items].sort((a, b) => a.id - b.id);
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));

    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
};

/** KST 달력 기준 일 번호(1970-01-01 = 0) */
const toKstDayNumber = (time: number) => Math.floor((time + KST_OFFSET_MS) / DAY_MS);

/** now의 KST 날짜에서 monthsAgo개월 전 같은 날의 일 번호. 그 달에 없는 날이면 말일로 맞춘다 */
const getMonthsAgoDayNumber = (now: Date, monthsAgo: number) => {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const totalMonths = kst.getUTCFullYear() * 12 + kst.getUTCMonth() - monthsAgo;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(kst.getUTCDate(), lastDay);

  return Date.UTC(year, month, day) / DAY_MS;
};

/**
 * 다시 보여줄 메모를 최대 3개 고른다
 * @description ① 1년·6개월·1개월 전 같은 날(±3일)에 쓴 메모를 기준마다 하나씩(가장 가까운 날 우선),
 * ② 모자라면 만든 지 14일 넘은 메모 중 시드(user_id+주) 무작위. excludeIds(이전 발송분)는 어디서도 제외한다.
 * 결과는 오래된 순이다.
 */
export const pickResurfaceMemos = ({
  candidates,
  excludeIds,
  now,
  seed,
  max = RESURFACE_MAX_MEMOS,
}: {
  candidates: IFResurfaceCandidate[];
  excludeIds: ReadonlySet<number>;
  now: Date;
  seed: string;
  max?: number;
}): IFResurfaceCandidate[] => {
  const cutoff = now.getTime() - RESURFACE_MIN_AGE_DAYS * DAY_MS;
  const eligible = candidates
    .filter((candidate) => !excludeIds.has(candidate.id))
    .filter((candidate) => {
      const time = new Date(candidate.created_at).getTime();

      return !Number.isNaN(time) && time <= cutoff;
    });
  const chosen: IFResurfaceCandidate[] = [];
  const chosenIds = new Set<number>();

  for (const monthsAgo of ANNIVERSARY_MONTHS_AGO) {
    if (chosen.length >= max) break;

    const targetDay = getMonthsAgoDayNumber(now, monthsAgo);
    let best: { candidate: IFResurfaceCandidate; distance: number } | null = null;

    for (const candidate of eligible) {
      if (chosenIds.has(candidate.id)) continue;

      const distance = Math.abs(
        toKstDayNumber(new Date(candidate.created_at).getTime()) - targetDay,
      );

      if (distance > ANNIVERSARY_TOLERANCE_DAYS) continue;

      // 거리가 같으면 id가 작은 쪽으로 고정해 입력 순서에 결과가 흔들리지 않게 한다
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && candidate.id < best.candidate.id)
      ) {
        best = { candidate, distance };
      }
    }

    if (best) {
      chosen.push(best.candidate);
      chosenIds.add(best.candidate.id);
    }
  }

  const rest = eligible.filter((candidate) => !chosenIds.has(candidate.id));

  for (const candidate of seededShuffle(rest, seed)) {
    if (chosen.length >= max) break;
    chosen.push(candidate);
  }

  return chosen.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
      a.id - b.id,
  );
};

/**
 * 사람에게 읽히는 경과 시간. 5주 미만은 주, 1년 미만은 개월, 그 뒤는 년
 */
export const formatMemoAge = (createdAt: string, now: Date): string => {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS),
  );

  if (days < 35) return `${Math.max(1, Math.floor(days / 7))}주 전`;
  if (days < 365) return `${Math.max(1, Math.floor(days / 30.4))}개월 전`;

  return `${Math.floor(days / 365)}년 전`;
};

/**
 * 마지막 본문 메모 작성일 내림차순 상위 limit명. 단계적 배포("최근 작성 순 50명")용
 */
export const takeMostRecentAuthors = <
  T extends { user_id: string; last_memo_at: string | null },
>(
  rows: T[],
  limit: number,
): T[] =>
  [...rows]
    .sort((a, b) => {
      const diff =
        new Date(b.last_memo_at ?? 0).getTime() -
        new Date(a.last_memo_at ?? 0).getTime();

      return diff || a.user_id.localeCompare(b.user_id);
    })
    .slice(0, limit);

/**
 * 주 단위로 고정된 무작위 순서. 하루 상한에 걸려 이틀에 나눠 보내도 같은 순서를 이어간다
 */
export const orderByWeekSeed = <T extends { user_id: string }>(
  rows: T[],
  weekStart: string,
): T[] =>
  [...rows].sort(
    (a, b) =>
      hashString(`${weekStart}:${a.user_id}`) -
        hashString(`${weekStart}:${b.user_id}`) ||
      a.user_id.localeCompare(b.user_id),
  );

/** 오늘(KST) 0시에 해당하는 UTC 시각. 하루 상한 집계의 시작점 */
export const getKstDayStart = (now: Date): Date =>
  new Date(toKstDayNumber(now.getTime()) * DAY_MS - KST_OFFSET_MS);
