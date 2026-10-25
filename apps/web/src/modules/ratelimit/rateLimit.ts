import { readServerEnv } from "@src/utils/serverEnv";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** 레이트 리밋 결과. 막혔으면 풀릴 때까지 남은 초(0 이상)를 담는다. */
export type TRateLimitResult =
	| { success: true }
	| { success: false; resetInSeconds: number };

/** `undefined`는 아직 env를 읽지 않은 상태, `null`은 UPSTASH 환경변수가 비어 레이트 리밋이 꺼진 상태다. */
let cachedRedis: Redis | null | undefined;

/**
 * 두 리미터가 공유하는 Redis 클라이언트를 호출 시점에 한 번만 만든다.
 * UPSTASH 환경변수가 없거나 빈 문자열이면 `null`을 돌려준다.
 */
const getRedis = (): Redis | null => {
	if (cachedRedis !== undefined) {
		return cachedRedis;
	}

	const upstashRedisRestUrl = readServerEnv("UPSTASH_REDIS_REST_URL");
	const upstashRedisRestToken = readServerEnv("UPSTASH_REDIS_REST_TOKEN");

	if (!upstashRedisRestUrl || !upstashRedisRestToken) {
		cachedRedis = null;

		return cachedRedis;
	}

	cachedRedis = new Redis({
		url: upstashRedisRestUrl,
		token: upstashRedisRestToken,
	});

	return cachedRedis;
};

/**
 * prefix별 슬라이딩 윈도우(1시간) 리미터를 확인하는 함수를 만든다.
 * 리미터는 첫 호출 때 만들어 재사용한다. Redis 호출 실패는 그대로 던진다.
 */
const createRateLimitChecker = ({
	prefix,
	limitPerHour,
}: {
	prefix: string;
	limitPerHour: number;
}) => {
	let cachedRatelimit: Ratelimit | null | undefined;

	const getRatelimit = (): Ratelimit | null => {
		if (cachedRatelimit !== undefined) {
			return cachedRatelimit;
		}

		const redis = getRedis();

		if (!redis) {
			cachedRatelimit = null;

			return cachedRatelimit;
		}

		cachedRatelimit = new Ratelimit({
			redis,
			limiter: Ratelimit.slidingWindow(limitPerHour, "1 h"),
			analytics: true,
			prefix,
		});

		return cachedRatelimit;
	};

	return async (identifier: string): Promise<TRateLimitResult> => {
		const ratelimit = getRatelimit();

		if (!ratelimit) {
			return { success: true };
		}

		const { success, reset } = await ratelimit.limit(identifier);

		if (success) {
			return { success: true };
		}

		return {
			success: false,
			resetInSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
		};
	};
};

/**
 * 클라이언트 IP 기준으로 OpenAI 요약 요청 한도(시간당 60회)를 확인한다.
 * @description UPSTASH 환경변수가 비어 있으면 레이트 리밋 없이 통과시킨다.
 */
export const checkOpenAIRateLimit = createRateLimitChecker({
	prefix: "openai-api",
	limitPerHour: 60,
});

/**
 * 사용자 id 기준으로 과거 메모 판정 요청 한도(시간당 120회)를 확인한다.
 * @description UPSTASH 환경변수가 비어 있으면 레이트 리밋 없이 통과시킨다.
 */
export const checkPastMemoRateLimit = createRateLimitChecker({
	prefix: "past-memo",
	limitPerHour: 120,
});

/** 남은 초를 "N분 M초" 형태의 사용자 표시 문구로 바꾼다. 0 이하는 "곧"이다. */
export const formatRemainingTime = (seconds: number): string => {
	if (seconds <= 0) {
		return "곧";
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes === 0) {
		return `${remainingSeconds}초`;
	}

	if (remainingSeconds === 0) {
		return `${minutes}분`;
	}

	return `${minutes}분 ${remainingSeconds}초`;
};
