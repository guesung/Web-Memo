import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const pastMemoRatelimit =
	UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
		? new Ratelimit({
				redis: new Redis({
					url: UPSTASH_REDIS_REST_URL,
					token: UPSTASH_REDIS_REST_TOKEN,
				}),
				limiter: Ratelimit.slidingWindow(120, "1 h"),
				analytics: true,
				prefix: "past-memo",
			})
		: null;

/** 과거 메모 판정 레이트 리밋 결과. 막혔으면 풀릴 때까지 남은 초를 담는다. */
export type TPastMemoRateLimitResult =
	| { success: true }
	| { success: false; resetInSeconds: number };

/**
 * 사용자 id 기준으로 과거 메모 판정 요청 한도(시간당 120회)를 확인한다.
 * @description UPSTASH 환경변수가 비어 있으면 레이트 리밋 없이 통과시킨다. Redis 호출 실패는 그대로 던진다.
 */
export const checkPastMemoRateLimit = async (
	userId: string,
): Promise<TPastMemoRateLimitResult> => {
	if (!pastMemoRatelimit) {
		return { success: true };
	}

	const { success, reset } = await pastMemoRatelimit.limit(userId);

	if (success) {
		return { success: true };
	}

	return {
		success: false,
		resetInSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
	};
};
