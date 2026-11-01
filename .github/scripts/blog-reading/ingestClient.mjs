/**
 * blog-catalog-ingest Edge Function 클라이언트.
 * secret은 호출자가 환경 변수에서 읽어 넘기고, 이 모듈은 헤더에만 싣습니다. 로그·에러 메시지에 값과 요청 본문을 남기지 않습니다.
 */

/** 운영 Supabase 프로젝트의 수집 엔드포인트. 프로젝트 URL은 packages/shared의 고정 상수와 같습니다 */
export const DEFAULT_INGEST_URL =
	"https://czwtqukymcqoberdoltq.supabase.co/functions/v1/blog-catalog-ingest";

export const INGEST_SECRET_HEADER = "x-blog-catalog-ingest-secret";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_BACKOFF_MS = 60_000;

/** 수집 엔드포인트가 거절하거나 실패했을 때. status 0은 네트워크 실패입니다 */
export class IngestError extends Error {
	constructor({ status, code, message }) {
		super(`수집 엔드포인트 ${status} ${code}: ${message}`);
		this.name = "IngestError";
		this.status = status;
		this.code = code;
	}
}

/** lease가 만료됐거나 세대가 바뀐 stale 쓰기인지 */
export const isStaleLeaseError = (error) =>
	error instanceof IngestError && error.status === 409;

/**
 * 재시도 대기 시간(ms). Retry-After(초)가 있으면 그것을, 없으면 지수 백오프(1s, 2s, 4s…)에 지터를 더합니다.
 */
export const computeBackoffMs = ({ attempt, retryAfter, random = Math.random }) => {
	const retryAfterSeconds = Number(retryAfter);

	if (retryAfter !== undefined && retryAfter !== null && retryAfter !== "" && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
		return Math.min(retryAfterSeconds * 1000, MAX_BACKOFF_MS);
	}

	return Math.min(1000 * 2 ** (attempt - 1) + Math.floor(random() * 250), MAX_BACKOFF_MS);
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 수집 엔드포인트 클라이언트를 만듭니다.
 * @description 네트워크 실패와 408/429/5xx만 제한 횟수 안에서 재시도합니다. 나머지 4xx(잘못된 요청·stale·검증 거절)는 즉시 던집니다.
 * claim은 재시도하지 않습니다. 응답을 잃은 재시도가 자기 lease에 막혀 오히려 작업을 지연시키기 때문입니다.
 */
export const createIngestClient = ({
	url = DEFAULT_INGEST_URL,
	secret,
	fetchImpl = fetch,
	sleep = defaultSleep,
	maxAttempts = 4,
	timeoutMs = 30_000,
}) => {
	if (!secret) {
		throw new Error("BLOG_CATALOG_INGEST_SECRET이 비어 있습니다");
	}

	const send = async (payload, attempts) => {
		let lastError = null;

		for (let attempt = 1; attempt <= attempts; attempt += 1) {
			let retryAfter = null;

			try {
				const response = await fetchImpl(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						[INGEST_SECRET_HEADER]: secret,
					},
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(timeoutMs),
				});

				if (response.ok) {
					return await response.json();
				}

				let errorBody = {};

				try {
					errorBody = await response.json();
				} catch {
					errorBody = {};
				}

				lastError = new IngestError({
					status: response.status,
					code: String(errorBody.code ?? "unknown"),
					message: String(errorBody.message ?? "응답 본문 없음").slice(0, 200),
				});

				if (!RETRYABLE_STATUSES.has(response.status)) {
					throw lastError;
				}

				retryAfter = response.headers.get("retry-after");
			} catch (error) {
				if (error instanceof IngestError && !RETRYABLE_STATUSES.has(error.status)) {
					throw error;
				}

				if (!(error instanceof IngestError)) {
					lastError = new IngestError({
						status: 0,
						code: "network",
						message: error instanceof Error ? error.name : "알 수 없는 네트워크 오류",
					});
				}
			}

			if (attempt < attempts) {
				await sleep(computeBackoffMs({ attempt, retryAfter }));
			}
		}

		throw lastError;
	};

	return {
		claim: ({ blogId, trigger, force = false, leaseSeconds = 1200 }) =>
			send({ action: "claim", blogId, trigger, force, leaseSeconds }, 1),
		batch: ({ blogId, generation, leaseToken, items }) =>
			send({ action: "batch", blogId, generation, leaseToken, items }, maxAttempts),
		checkpoint: ({ blogId, generation, leaseToken, checkpoint }) =>
			send({ action: "checkpoint", blogId, generation, leaseToken, checkpoint }, maxAttempts),
		finish: ({ blogId, generation, leaseToken, evidence }) =>
			send({ action: "finish", blogId, generation, leaseToken, evidence }, maxAttempts),
		fail: ({ blogId, generation, leaseToken, errorCode, checkpoint = null, keepCheckpoint = true }) =>
			send({ action: "fail", blogId, generation, leaseToken, errorCode, checkpoint, keepCheckpoint }, maxAttempts),
	};
};
