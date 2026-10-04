/**
 * blog-catalog-ingest 요청 검증. HTTP를 모르는 순수 함수라 Deno 없이 Vitest로 검증한다.
 * DB 함수(memo.ingest_blog_batch 등)가 같은 규칙을 한 번 더 강제하므로, 여기서 통과해도 DB가 거절할 수 있다.
 */

export const BLOG_IDS = ["toss", "daangn"] as const;

export const CLAIM_TRIGGERS = ["daily", "request", "manual"] as const;

export const FAIL_ERROR_CODES = [
  "time_limit",
  "blocked",
  "http_error",
  "rate_limited",
  "schema_changed",
  "count_mismatch",
  "network",
  "internal",
] as const;

/** 한 배치의 최대 글 수 */
export const MAX_BATCH_ITEMS = 100;

const MAX_CHECKPOINT_BYTES = 8192;
const MAX_URL_LENGTH = 2000;
const MAX_ALIAS_URLS = 5;

export type TBlogId = (typeof BLOG_IDS)[number];
export type TClaimTrigger = (typeof CLAIM_TRIGGERS)[number];
export type TFailErrorCode = (typeof FAIL_ERROR_CODES)[number];

/** 저장할 글 메타. 이 밖의 키(본문 등)는 검증 단계에서 버린다 */
export interface IFBlogArticleItem {
  providerId: string;
  title: string;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  aliasUrls: string[];
}

export type TIngestRequest =
  | {
      action: "claim";
      blogId: TBlogId;
      trigger: TClaimTrigger;
      force: boolean;
      leaseSeconds: number;
    }
  | {
      action: "batch";
      blogId: TBlogId;
      generation: number;
      leaseToken: string;
      items: IFBlogArticleItem[];
    }
  | {
      action: "checkpoint";
      blogId: TBlogId;
      generation: number;
      leaseToken: string;
      checkpoint: Record<string, unknown>;
    }
  | {
      action: "finish";
      blogId: TBlogId;
      generation: number;
      leaseToken: string;
      evidence: Record<string, unknown>;
    }
  | {
      action: "fail";
      blogId: TBlogId;
      generation: number;
      leaseToken: string;
      errorCode: TFailErrorCode;
      checkpoint: Record<string, unknown> | null;
      keepCheckpoint: boolean;
    };

export type TParseResult<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const fail = (message: string): { ok: false; message: string } => ({
  ok: false,
  message,
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBlogId = (value: unknown): value is TBlogId =>
  typeof value === "string" && (BLOG_IDS as readonly string[]).includes(value);

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1;

/** 글 URL이 소스별 허용 접두와 맞는지. DB의 memo.blog_url_allowed와 같은 규칙이다 */
export const isAllowedArticleUrl = ({
  blogId,
  url,
  isAlias,
}: {
  blogId: TBlogId;
  url: string;
  isAlias: boolean;
}): boolean => {
  if (url.length > MAX_URL_LENGTH || /\s/.test(url)) {
    return false;
  }

  try {
    new URL(url);
  } catch {
    return false;
  }

  if (blogId === "toss") {
    return url.startsWith("https://toss.tech/article/");
  }

  if (isAlias) {
    return url.startsWith("https://medium.com/");
  }

  return url.startsWith("https://medium.com/daangn/");
};

const parseTimestamp = (
  value: unknown,
  fieldName: string,
): TParseResult<string | null> => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (
    typeof value !== "string" ||
    !ISO_DATETIME_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    return fail(`${fieldName}은 ISO 8601 시각이어야 합니다`);
  }

  return { ok: true, value };
};

const parseItem = (
  blogId: TBlogId,
  rawItem: unknown,
  index: number,
): TParseResult<IFBlogArticleItem> => {
  const label = `items[${index}]`;

  if (!isPlainObject(rawItem)) {
    return fail(`${label}은 객체여야 합니다`);
  }

  const { providerId, title, url, aliasUrls } = rawItem;

  if (typeof providerId !== "string" || !PROVIDER_ID_PATTERN.test(providerId)) {
    return fail(`${label}.providerId 형식이 올바르지 않습니다`);
  }

  if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 500) {
    return fail(`${label}.title은 1~500자여야 합니다`);
  }

  if (typeof url !== "string" || !isAllowedArticleUrl({ blogId, url, isAlias: false })) {
    return fail(`${label}.url이 허용된 글 주소가 아닙니다`);
  }

  const publishedAt = parseTimestamp(rawItem.publishedAt, `${label}.publishedAt`);

  if (!publishedAt.ok) {
    return publishedAt;
  }

  const updatedAt = parseTimestamp(rawItem.updatedAt, `${label}.updatedAt`);

  if (!updatedAt.ok) {
    return updatedAt;
  }

  let normalizedAliasUrls: string[] = [];

  if (aliasUrls !== undefined && aliasUrls !== null) {
    if (!Array.isArray(aliasUrls) || aliasUrls.length > MAX_ALIAS_URLS) {
      return fail(`${label}.aliasUrls는 ${MAX_ALIAS_URLS}개 이하 배열이어야 합니다`);
    }

    const invalidAlias = aliasUrls.some(
      (aliasUrl) =>
        typeof aliasUrl !== "string" ||
        !isAllowedArticleUrl({ blogId, url: aliasUrl, isAlias: true }),
    );

    if (invalidAlias) {
      return fail(`${label}.aliasUrls에 허용되지 않은 주소가 있습니다`);
    }

    normalizedAliasUrls = aliasUrls as string[];
  }

  return {
    ok: true,
    value: {
      providerId,
      title: title.trim(),
      url,
      publishedAt: publishedAt.value,
      updatedAt: updatedAt.value,
      aliasUrls: normalizedAliasUrls,
    },
  };
};

const parseJsonObject = (
  value: unknown,
  fieldName: string,
): TParseResult<Record<string, unknown>> => {
  if (!isPlainObject(value)) {
    return fail(`${fieldName}은 객체여야 합니다`);
  }

  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_CHECKPOINT_BYTES) {
    return fail(`${fieldName}은 ${MAX_CHECKPOINT_BYTES}바이트 이하여야 합니다`);
  }

  return { ok: true, value };
};

/** 소스별 종료 증거의 모양을 확인한다. 저장된 고유 수와의 대조는 DB(memo.finish_blog_sync)가 한다 */
const parseEvidence = (
  blogId: TBlogId,
  value: unknown,
): TParseResult<Record<string, unknown>> => {
  if (!isPlainObject(value)) {
    return fail("evidence는 객체여야 합니다");
  }

  if (blogId === "toss") {
    const isValid =
      value.kind === "toss" &&
      value.nextIsNull === true &&
      isPositiveInteger(value.reportedCount) &&
      isPositiveInteger(value.uniqueCount) &&
      isPositiveInteger(value.pageCount);

    if (!isValid) {
      return fail("toss 종료 증거가 올바르지 않습니다");
    }

    return {
      ok: true,
      value: {
        kind: "toss",
        nextIsNull: true,
        reportedCount: value.reportedCount,
        uniqueCount: value.uniqueCount,
        pageCount: value.pageCount,
      },
    };
  }

  const isValid =
    value.kind === "daangn" &&
    value.hasNextPage === false &&
    (value.endCursor === "" || value.endCursor === null) &&
    isPositiveInteger(value.uniqueCount);

  if (!isValid) {
    return fail("daangn 종료 증거가 올바르지 않습니다");
  }

  return {
    ok: true,
    value: {
      kind: "daangn",
      hasNextPage: false,
      endCursor: "",
      uniqueCount: value.uniqueCount,
    },
  };
};

/** 요청 본문을 검증하고 정규화한다. 알 수 없는 키는 버린다 */
export const parseIngestRequest = (body: unknown): TParseResult<TIngestRequest> => {
  if (!isPlainObject(body)) {
    return fail("본문은 JSON 객체여야 합니다");
  }

  const { action, blogId } = body;

  if (!isBlogId(blogId)) {
    return fail("blogId가 올바르지 않습니다");
  }

  if (action === "claim") {
    const { trigger, force, leaseSeconds } = body;

    if (
      typeof trigger !== "string" ||
      !(CLAIM_TRIGGERS as readonly string[]).includes(trigger)
    ) {
      return fail("trigger가 올바르지 않습니다");
    }

    if (force !== undefined && typeof force !== "boolean") {
      return fail("force는 boolean이어야 합니다");
    }

    if (
      leaseSeconds !== undefined &&
      !(Number.isInteger(leaseSeconds) && (leaseSeconds as number) >= 60 && (leaseSeconds as number) <= 3600)
    ) {
      return fail("leaseSeconds는 60~3600 정수여야 합니다");
    }

    return {
      ok: true,
      value: {
        action,
        blogId,
        trigger: trigger as TClaimTrigger,
        force: force === true,
        leaseSeconds: (leaseSeconds as number | undefined) ?? 1200,
      },
    };
  }

  if (
    action !== "batch" &&
    action !== "checkpoint" &&
    action !== "finish" &&
    action !== "fail"
  ) {
    return fail("action이 올바르지 않습니다");
  }

  const { generation, leaseToken } = body;

  if (!isPositiveInteger(generation)) {
    return fail("generation은 1 이상의 정수여야 합니다");
  }

  if (typeof leaseToken !== "string" || !UUID_PATTERN.test(leaseToken)) {
    return fail("leaseToken 형식이 올바르지 않습니다");
  }

  if (action === "batch") {
    const { items } = body;

    if (!Array.isArray(items) || items.length < 1 || items.length > MAX_BATCH_ITEMS) {
      return fail(`items는 1~${MAX_BATCH_ITEMS}개 배열이어야 합니다`);
    }

    const parsedItems: IFBlogArticleItem[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const parsedItem = parseItem(blogId, items[index], index);

      if (!parsedItem.ok) {
        return parsedItem;
      }

      parsedItems.push(parsedItem.value);
    }

    return {
      ok: true,
      value: { action, blogId, generation, leaseToken, items: parsedItems },
    };
  }

  if (action === "checkpoint") {
    const checkpoint = parseJsonObject(body.checkpoint, "checkpoint");

    if (!checkpoint.ok) {
      return checkpoint;
    }

    return {
      ok: true,
      value: { action, blogId, generation, leaseToken, checkpoint: checkpoint.value },
    };
  }

  if (action === "finish") {
    const evidence = parseEvidence(blogId, body.evidence);

    if (!evidence.ok) {
      return evidence;
    }

    return {
      ok: true,
      value: { action, blogId, generation, leaseToken, evidence: evidence.value },
    };
  }

  const { errorCode, keepCheckpoint } = body;

  if (
    typeof errorCode !== "string" ||
    !(FAIL_ERROR_CODES as readonly string[]).includes(errorCode)
  ) {
    return fail("errorCode가 올바르지 않습니다");
  }

  if (keepCheckpoint !== undefined && typeof keepCheckpoint !== "boolean") {
    return fail("keepCheckpoint는 boolean이어야 합니다");
  }

  let failCheckpoint: Record<string, unknown> | null = null;

  if (body.checkpoint !== undefined && body.checkpoint !== null) {
    const checkpoint = parseJsonObject(body.checkpoint, "checkpoint");

    if (!checkpoint.ok) {
      return checkpoint;
    }

    failCheckpoint = checkpoint.value;
  }

  return {
    ok: true,
    value: {
      action,
      blogId,
      generation,
      leaseToken,
      errorCode: errorCode as TFailErrorCode,
      checkpoint: failCheckpoint,
      keepCheckpoint: keepCheckpoint !== false,
    },
  };
};
