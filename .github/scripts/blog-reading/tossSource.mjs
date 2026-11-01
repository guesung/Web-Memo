/**
 * 토스 기술 블로그 수집. 공식 사이트가 쓰는 공개 목록 API를 마지막 페이지(next=null)까지 순회합니다.
 * 수집 URL은 아래 상수로 고정하며 사용자 입력을 받지 않습니다. 제목·URL·게시일·수정일·글 ID만 남기고 본문은 버립니다.
 * 총 글 수는 하드코딩하지 않습니다. 응답의 count와 순회로 모은 고유 글 수가 같을 때만 완료 증거를 만듭니다.
 */

import { computeBackoffMs } from "./ingestClient.mjs";
import { SourceError } from "./sourceError.mjs";

export const TOSS_API_ORIGIN = "https://api-public.toss.im";
export const TOSS_POSTS_PATH = "/api-public/v3/ipd-thor/api/v1/workspaces/15/posts";
export const TOSS_PAGE_SIZE = 100;
export const TOSS_FIRST_PAGE_URL = `${TOSS_API_ORIGIN}${TOSS_POSTS_PATH}?page=1&size=${TOSS_PAGE_SIZE}`;
export const TOSS_ARTICLE_URL_PREFIX = "https://toss.tech/article/";

const USER_AGENT = "web-memo-blog-catalog/1.0 (+https://webmemo.xyz)";
const MAX_FETCH_ATTEMPTS = 4;
const MAX_TRAVERSAL_ATTEMPTS = 2;

/** 응답 next가 같은 API·같은 경로·(page, size) 두 파라미터이고 page가 정확히 다음 번호일 때만 URL을 돌려줍니다. null이면 마지막입니다 */
export const resolveNextPageUrl = ({ next, expectedPage }) => {
	if (next === null) {
		return null;
	}

	if (typeof next !== "string" || next === "") {
		throw new SourceError("schema_changed", "토스 next가 문자열이나 null이 아닙니다");
	}

	let url;

	try {
		url = new URL(next, TOSS_API_ORIGIN);
	} catch {
		throw new SourceError("schema_changed", "토스 next를 URL로 해석할 수 없습니다");
	}

	if (url.origin !== TOSS_API_ORIGIN || url.pathname !== TOSS_POSTS_PATH || url.username !== "" || url.password !== "" || url.hash !== "") {
		throw new SourceError("schema_changed", "토스 next가 허용된 호스트·경로가 아닙니다");
	}

	const parameterNames = [...url.searchParams.keys()].sort();

	if (parameterNames.length !== 2 || parameterNames[0] !== "page" || parameterNames[1] !== "size") {
		throw new SourceError("schema_changed", "토스 next의 쿼리 파라미터가 page·size가 아닙니다");
	}

	if (url.searchParams.get("size") !== String(TOSS_PAGE_SIZE) || url.searchParams.get("page") !== String(expectedPage)) {
		throw new SourceError("schema_changed", "토스 next의 page·size가 기대와 다릅니다");
	}

	return url.toString();
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const toIsoOrNull = (value, label) => {
	if (value === null || value === undefined) {
		return null;
	}

	const time = typeof value === "string" ? Date.parse(value) : Number.NaN;

	if (Number.isNaN(time)) {
		throw new SourceError("schema_changed", `토스 ${label} 시각을 해석할 수 없습니다`);
	}

	return new Date(time).toISOString();
};

/** API 항목에서 저장할 메타만 뽑습니다. 본문(fullDescription 등)과 나머지 필드는 버립니다 */
export const toTossArticle = (item) => {
	const hasId = Number.isSafeInteger(item?.id) && item.id > 0;

	if (!hasId || !isNonEmptyString(item.title)) {
		throw new SourceError("schema_changed", "토스 글 항목에 id·title이 없습니다");
	}

	const providerId = String(item.id);
	const slug = isNonEmptyString(item.key) ? item.key.trim() : providerId;
	const url = `${TOSS_ARTICLE_URL_PREFIX}${encodeURIComponent(slug)}`;
	const aliasUrls = slug === providerId ? [] : [`${TOSS_ARTICLE_URL_PREFIX}${providerId}`];

	return {
		providerId,
		title: item.title.trim(),
		url,
		publishedAt: toIsoOrNull(item.publishedTime, "publishedTime"),
		updatedAt: toIsoOrNull(item.updatedTime, "updatedTime"),
		aliasUrls,
	};
};

/** 한 페이지 응답을 검증합니다. 스키마가 다르면 조용히 넘기지 않고 schema_changed로 던집니다 */
export const parseTossPage = (body, { expectedPage }) => {
	const success = body?.success;
	const isValid =
		body?.resultType === "SUCCESS" &&
		success &&
		typeof success === "object" &&
		Number.isSafeInteger(success.count) &&
		success.count >= 0 &&
		success.page === expectedPage &&
		success.pageSize === TOSS_PAGE_SIZE &&
		Array.isArray(success.results) &&
		success.results.length <= TOSS_PAGE_SIZE &&
		(success.next === null || typeof success.next === "string");

	if (!isValid) {
		throw new SourceError("schema_changed", `토스 ${expectedPage}페이지 응답 스키마가 기대와 다릅니다`);
	}

	return {
		count: success.count,
		next: success.next,
		articles: success.results.map(toTossArticle),
	};
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 한 페이지를 가져옵니다. 429/5xx와 네트워크 오류만 제한 재시도하고, 401/403은 차단으로 기록합니다.
 */
export const fetchTossPageJson = async ({ url, fetchImpl = fetch, sleep = defaultSleep, timeoutMs = 30_000 }) => {
	let lastError = null;

	for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
		let retryAfter = null;

		try {
			const response = await fetchImpl(url, {
				headers: { Accept: "application/json", "User-Agent": USER_AGENT },
				signal: AbortSignal.timeout(timeoutMs),
			});

			if (response.ok) {
				return await response.json();
			}

			if (response.status === 401 || response.status === 403) {
				throw new SourceError("blocked", `토스 API가 ${response.status}로 접근을 거절했습니다`);
			}

			if (response.status === 429) {
				lastError = new SourceError("rate_limited", "토스 API가 429를 반환했습니다");
				retryAfter = response.headers.get("retry-after");
			} else if (response.status >= 500) {
				lastError = new SourceError("http_error", `토스 API가 ${response.status}를 반환했습니다`);
			} else {
				throw new SourceError("http_error", `토스 API가 ${response.status}를 반환했습니다`);
			}
		} catch (error) {
			if (error instanceof SourceError && error !== lastError) {
				throw error;
			}

			if (!(error instanceof SourceError)) {
				lastError = new SourceError("network", "토스 API 요청이 실패했습니다", { cause: error });
			}
		}

		if (attempt < MAX_FETCH_ATTEMPTS) {
			await sleep(computeBackoffMs({ attempt, retryAfter }));
		}
	}

	throw lastError;
};

/** 순회 중 count가 바뀌거나 중복이 생긴 경우(수집 도중 새 글이 올라옴). 처음부터 다시 돌립니다 */
class TraversalDriftError extends Error {}

const chunk = (items, size) => {
	const chunks = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
};

const traverseOnce = async ({ ingest, fetchImpl, sleep, now, deadline, log }) => {
	const seenIds = new Set();
	let reportedCount = null;
	let pageCount = 0;
	let page = 1;
	let url = TOSS_FIRST_PAGE_URL;

	while (url !== null) {
		if (now() >= deadline) {
			throw new SourceError("time_limit", "시간 제한에 도달했습니다", { checkpoint: { nextPage: page } });
		}

		const body = await fetchTossPageJson({ url, fetchImpl, sleep });
		const parsed = parseTossPage(body, { expectedPage: page });

		if (reportedCount === null) {
			reportedCount = parsed.count;
		}

		if (parsed.count !== reportedCount) {
			throw new TraversalDriftError(`페이지 사이에 count가 바뀌었습니다 (${reportedCount} -> ${parsed.count})`);
		}

		// 페이지 수 가드: 총 개수로 계산한 마지막 페이지를 한 장 넘어서면 next 사슬이 비정상입니다(상한이 아니라 무한 순회 방지).
		if (page > Math.ceil(reportedCount / TOSS_PAGE_SIZE) + 1) {
			throw new SourceError("schema_changed", "토스 next 사슬이 count보다 길게 이어집니다");
		}

		for (const article of parsed.articles) {
			if (seenIds.has(article.providerId)) {
				throw new TraversalDriftError(`순회 중 같은 글이 두 번 나왔습니다 (${article.providerId})`);
			}

			seenIds.add(article.providerId);
		}

		for (const items of chunk(parsed.articles, 100)) {
			await ingest.batch(items);
		}

		pageCount += 1;
		await ingest.checkpoint({ nextPage: page + 1, uniqueCount: seenIds.size, reportedCount });
		log(`토스 ${page}페이지 저장: ${parsed.articles.length}개 (누적 고유 ${seenIds.size}/${reportedCount})`);

		page += 1;
		url = resolveNextPageUrl({ next: parsed.next, expectedPage: page });
	}

	if (seenIds.size !== reportedCount) {
		throw new TraversalDriftError(`마지막 페이지에서 고유 수(${seenIds.size})가 count(${reportedCount})와 다릅니다`);
	}

	return { kind: "toss", nextIsNull: true, reportedCount, uniqueCount: seenIds.size, pageCount };
};

/**
 * 토스 전체 순회. 항상 첫 페이지부터 돌고 저장은 글 ID 기준 upsert라, 재개는 "기존 글 보존 + 누락분 수집"입니다.
 * 순회 도중 count가 바뀌거나 중복이 생기면 한 번 더 처음부터 돌고, 그래도 어긋나면 count_mismatch로 실패합니다.
 *
 * @returns 완료 증거 {kind:'toss', nextIsNull:true, reportedCount, uniqueCount, pageCount}
 */
export const collectToss = async ({ ingest, fetchImpl = fetch, sleep = defaultSleep, now = Date.now, deadline = Number.POSITIVE_INFINITY, log = () => {} }) => {
	let lastDrift = null;

	for (let attempt = 1; attempt <= MAX_TRAVERSAL_ATTEMPTS; attempt += 1) {
		try {
			return await traverseOnce({ ingest, fetchImpl, sleep, now, deadline, log });
		} catch (error) {
			if (!(error instanceof TraversalDriftError)) {
				throw error;
			}

			lastDrift = error;
			log(`토스 순회 ${attempt}회차가 어긋나 처음부터 다시 돕니다: ${error.message}`);
		}
	}

	throw new SourceError("count_mismatch", lastDrift.message, { cause: lastDrift });
};
