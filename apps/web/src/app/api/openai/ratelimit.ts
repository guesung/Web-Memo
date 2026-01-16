import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isRateLimitEnabled =
	UPSTASH_REDIS_REST_URL !== undefined &&
	UPSTASH_REDIS_REST_TOKEN !== undefined &&
	UPSTASH_REDIS_REST_URL !== "" &&
	UPSTASH_REDIS_REST_TOKEN !== "";

const ratelimit = isRateLimitEnabled
	? new Ratelimit({
			redis: new Redis({
				url: UPSTASH_REDIS_REST_URL,
				token: UPSTASH_REDIS_REST_TOKEN,
			}),
			limiter: Ratelimit.slidingWindow(60, "1 h"),
			analytics: true,
			prefix: "openai-api",
		})
	: null;

export type RateLimitResult =
	| { success: true }
	| { success: false; resetInSeconds: number };

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
	if (!ratelimit) {
		return { success: true };
	}

	const { success, reset } = await ratelimit.limit(ip);

	if (success) {
		return { success: true };
	}

	const resetInSeconds = Math.ceil((reset - Date.now()) / 1000);
	return { success: false, resetInSeconds };
}

export function formatRemainingTime(seconds: number): string {
	if (seconds <= 0) return "곧";

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes === 0) {
		return `${remainingSeconds}초`;
	}

	if (remainingSeconds === 0) {
		return `${minutes}분`;
	}

	return `${minutes}분 ${remainingSeconds}초`;
}
