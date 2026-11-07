// 주간 리포트 메일의 수신 거부·클릭 링크가 쓰는 HMAC 토큰.
// Deno(Edge Function)와 Node(Vitest) 양쪽에서 실행되므로 node:crypto의 동기 HMAC을 쓴다.
// 목적 문자열을 서명 입력 앞에 붙여 도메인을 나눈다 — 수신 거부 토큰으로 클릭 토큰을 위조할 수 없다.
import { createHmac, timingSafeEqual } from "node:crypto";

const UNSUBSCRIBE_PURPOSE = "weekly-report-unsubscribe";
const CLICK_PURPOSE = "weekly-report-click";
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEEK_START_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_SECRET_LENGTH = 32;

export type TReportKind = "report" | "resurface";

export interface IFClickPayload {
  userId: string;
  weekStart: string;
  kind: TReportKind;
  position: string;
  destination: string;
}

/**
 * UNSUBSCRIBE_SECRET을 읽는다. 없거나 짧으면 throw한다 — 약한 키로 토큰을 만들지 않는다.
 */
export const readTokenSecret = (): string => {
  const secret = Deno.env.get("UNSUBSCRIBE_SECRET");

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      "UNSUBSCRIBE_SECRET 시크릿이 없거나 32자보다 짧습니다. supabase secrets set UNSUBSCRIBE_SECRET=... 로 등록하세요.",
    );
  }

  return secret;
};

const sign = (secret: string, purpose: string, data: string) =>
  createHmac("sha256", secret)
    .update(`${purpose}.${data}`)
    .digest("base64url");

const isSignatureValid = (
  secret: string,
  purpose: string,
  data: string,
  signature: string,
) => {
  const expected = Buffer.from(sign(secret, purpose, data));
  const provided = Buffer.from(signature);

  // timingSafeEqual은 길이가 다르면 throw하므로 먼저 길이를 본다
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};

/** 수신 거부 토큰: `<user_id>.<서명>`. 만료 없음 */
export const signUnsubscribeToken = (userId: string, secret: string) =>
  `${userId}.${sign(secret, UNSUBSCRIBE_PURPOSE, userId)}`;

/** 유효하면 user_id, 아니면 null */
export const verifyUnsubscribeToken = (
  token: string | null | undefined,
  secret: string,
): string | null => {
  const [userId, signature, ...rest] = (token ?? "").split(".");

  if (rest.length > 0 || !userId || !signature || !USER_ID_PATTERN.test(userId)) {
    return null;
  }

  return isSignatureValid(secret, UNSUBSCRIBE_PURPOSE, userId, signature)
    ? userId
    : null;
};

/** 클릭 토큰: `<base64url(payload JSON)>.<서명>` */
export const signClickToken = (payload: IFClickPayload, secret: string) => {
  const data = Buffer.from(
    JSON.stringify({
      u: payload.userId,
      w: payload.weekStart,
      k: payload.kind,
      p: payload.position,
      d: payload.destination,
    }),
  ).toString("base64url");

  return `${data}.${sign(secret, CLICK_PURPOSE, data)}`;
};

/** 유효하면 payload, 서명이 틀리거나 형태가 깨졌으면 null */
export const verifyClickToken = (
  token: string | null | undefined,
  secret: string,
): IFClickPayload | null => {
  const [data, signature, ...rest] = (token ?? "").split(".");

  if (rest.length > 0 || !data || !signature) {
    return null;
  }

  if (!isSignatureValid(secret, CLICK_PURPOSE, data, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));

    if (
      typeof parsed?.u !== "string" ||
      !USER_ID_PATTERN.test(parsed.u) ||
      typeof parsed.w !== "string" ||
      !WEEK_START_PATTERN.test(parsed.w) ||
      (parsed.k !== "report" && parsed.k !== "resurface") ||
      typeof parsed.p !== "string" ||
      typeof parsed.d !== "string"
    ) {
      return null;
    }

    return {
      userId: parsed.u,
      weekStart: parsed.w,
      kind: parsed.k,
      position: parsed.p,
      destination: parsed.d,
    };
  } catch {
    // 서명은 맞는데 JSON이 깨진 경우. 우리가 만든 토큰이 아니므로 무효로 본다
    return null;
  }
};
