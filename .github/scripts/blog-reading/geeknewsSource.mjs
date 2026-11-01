/**
 * 긱뉴스(GeekNews) Atom 피드 수집. 최근 글 50개만 담긴 공개 피드를 한 번 읽어 topic?id=N URL·제목·게시일만 저장합니다.
 * 아카이브(토스·당근)와 달리 전체 순회가 아니라 누적형입니다 — 피드에서 빠진 글은 서버가 지우거나 숨기지 않습니다.
 * 수집 URL은 아래 상수로 고정하며 사용자 입력을 받지 않습니다. 본문(content·summary)과 원문 링크는 읽지도 저장하지도 않습니다.
 * 새 의존성 없이 필요한 태그만 정규식으로 읽습니다. 구조가 기대와 다르면 조용히 넘기지 않고 schema_changed로 던집니다.
 */

import { computeBackoffMs } from "./ingestClient.mjs";
import { SourceError } from "./sourceError.mjs";

export const GEEKNEWS_FEED_URL = "https://news.hada.io/rss/news";
export const GEEKNEWS_TOPIC_URL_PREFIX = "https://news.hada.io/topic?id=";

const ATOM_NAMESPACE = "http://www.w3.org/2005/Atom";
const USER_AGENT = "web-memo-blog-catalog/1.0 (+https://webmemo.xyz)";
const MAX_FETCH_ATTEMPTS = 4;
const MAX_FEED_BYTES = 5_000_000;
const MAX_TITLE_LENGTH = 500;
const BATCH_SIZE = 100;

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const decodeEntities = (text) =>
	text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body) => {
		if (body[0] === "#") {
			const codePoint = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);

			return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
		}

		return NAMED_ENTITIES[body] ?? match;
	});

/** 요소 안의 텍스트. CDATA는 그대로, 일반 텍스트는 엔티티를 풀어 줍니다 */
const readText = (raw) => {
	const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);

	return (cdata ? cdata[1] : decodeEntities(raw)).replace(/\s+/g, " ").trim();
};

/** 이름(네임스페이스 접두 허용)이 같은 첫 요소의 안쪽 텍스트. 없으면 null */
const findElementText = (xml, name) => {
	const match = xml.match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?${name}\\s*>`));

	return match ? readText(match[1]) : null;
};

/** 속성 값을 읽습니다. 따옴표 종류와 속성 순서에 상관없습니다 */
const readAttribute = (tag, name) => {
	const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`));

	return match ? decodeEntities(match[1] ?? match[2]) : null;
};

/** https://news.hada.io/topic?id=<숫자> 만 받아 숫자 id를 돌려줍니다. 그 밖의 주소는 null */
export const parseTopicId = (value) => {
	if (typeof value !== "string") {
		return null;
	}

	const match = value.trim().match(/^https:\/\/news\.hada\.io\/topic\?id=([0-9]{1,18})$/);

	return match ? match[1] : null;
};

const toIsoOrNull = (value) => {
	if (value === null || value === "") {
		return null;
	}

	const time = Date.parse(value);

	return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/** 루트가 Atom feed인지 확인합니다 */
const assertAtomFeed = (xml) => {
	const withoutProlog = xml
		.replace(/^﻿/, "")
		.replace(/<\?[\s\S]*?\?>/g, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<!DOCTYPE[^>]*>/gi, "")
		.trimStart();
	const root = withoutProlog.match(/^<((?:[A-Za-z0-9_-]+:)?feed)(\s[^>]*)?>/);

	if (!root || !(root[2] ?? "").includes(ATOM_NAMESPACE)) {
		throw new SourceError("schema_changed", "긱뉴스 응답의 루트가 Atom feed가 아닙니다");
	}
};

/** 엔트리 하나에서 저장할 메타만 뽑습니다. 글 주소를 읽지 못하면 null */
const toArticle = (entryXml) => {
	// 본문·요약·작성자 안의 태그를 엔트리 메타로 잘못 읽지 않도록 먼저 덜어 냅니다.
	const meta = entryXml.replace(/<(?:[A-Za-z0-9_-]+:)?(content|summary|author)(?:\s[^>]*)?>[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?\1\s*>/g, "");
	const linkTags = [...meta.matchAll(/<(?:[A-Za-z0-9_-]+:)?link(\s[^>]*?)\/?>/g)].map((match) => match[1]);
	const alternate = linkTags.filter((tag) => {
		const rel = readAttribute(tag, "rel");

		return rel === null || rel === "alternate";
	});
	const candidates = [...alternate.map((tag) => readAttribute(tag, "href")), findElementText(meta, "id")];
	const providerId = candidates.map(parseTopicId).find((id) => id !== null) ?? null;
	const title = (findElementText(meta, "title") ?? "").slice(0, MAX_TITLE_LENGTH).trim();

	if (providerId === null || title === "") {
		return null;
	}

	const published = toIsoOrNull(findElementText(meta, "published"));
	const updated = toIsoOrNull(findElementText(meta, "updated"));

	return {
		providerId,
		title,
		url: `${GEEKNEWS_TOPIC_URL_PREFIX}${providerId}`,
		publishedAt: published ?? updated,
		updatedAt: published === null ? null : updated,
		aliasUrls: [],
	};
};

/**
 * Atom 피드 XML을 해석합니다. 같은 글은 처음 나온 것만 남깁니다.
 * schema_changed: 루트가 Atom feed가 아님 / 엔트리가 없음 / 엔트리가 있는데 topic?id=N을 하나도 뽑지 못함
 *
 * @returns {{ articles: object[], entryCount: number }} entryCount는 피드의 엔트리 수, articles는 고유 글
 */
export const parseGeeknewsFeed = (xml) => {
	if (typeof xml !== "string" || xml.length === 0) {
		throw new SourceError("schema_changed", "긱뉴스 응답이 비어 있습니다");
	}

	assertAtomFeed(xml);

	const entries = [...xml.matchAll(/<(?:[A-Za-z0-9_-]+:)?entry(?:\s[^>]*)?>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?entry\s*>/g)].map((match) => match[1]);

	if (entries.length === 0) {
		throw new SourceError("schema_changed", "긱뉴스 피드에 엔트리가 없습니다");
	}

	const articles = new Map();

	for (const entry of entries) {
		const article = toArticle(entry);

		if (article !== null && !articles.has(article.providerId)) {
			articles.set(article.providerId, article);
		}
	}

	if (articles.size === 0) {
		throw new SourceError("schema_changed", "긱뉴스 엔트리에서 topic?id=N 주소를 하나도 읽지 못했습니다");
	}

	return { articles: [...articles.values()], entryCount: entries.length };
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 피드를 가져옵니다. 429/5xx와 네트워크 오류만 제한 재시도하고, 401/403은 차단으로 기록합니다 */
export const fetchGeeknewsFeed = async ({ fetchImpl = fetch, sleep = defaultSleep, timeoutMs = 30_000 } = {}) => {
	let lastError = null;

	for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
		let retryAfter = null;

		try {
			const response = await fetchImpl(GEEKNEWS_FEED_URL, {
				headers: { Accept: "application/atom+xml, application/xml;q=0.9, */*;q=0.5", "User-Agent": USER_AGENT },
				signal: AbortSignal.timeout(timeoutMs),
			});

			if (response.ok) {
				const text = await response.text();

				if (text.length > MAX_FEED_BYTES) {
					throw new SourceError("schema_changed", "긱뉴스 응답이 예상보다 훨씬 큽니다");
				}

				return text;
			}

			if (response.status === 401 || response.status === 403) {
				throw new SourceError("blocked", `긱뉴스 피드가 ${response.status}로 접근을 거절했습니다`);
			}

			if (response.status === 429) {
				lastError = new SourceError("rate_limited", "긱뉴스 피드가 429를 반환했습니다");
				retryAfter = response.headers.get("retry-after");
			} else if (response.status >= 500) {
				lastError = new SourceError("http_error", `긱뉴스 피드가 ${response.status}를 반환했습니다`);
			} else {
				throw new SourceError("http_error", `긱뉴스 피드가 ${response.status}를 반환했습니다`);
			}
		} catch (error) {
			if (error instanceof SourceError && error !== lastError) {
				throw error;
			}

			if (!(error instanceof SourceError)) {
				lastError = new SourceError("network", "긱뉴스 피드 요청이 실패했습니다", { cause: error });
			}
		}

		if (attempt < MAX_FETCH_ATTEMPTS) {
			await sleep(computeBackoffMs({ attempt, retryAfter }));
		}
	}

	throw lastError;
};

/**
 * 긱뉴스 피드 수집. 한 번 읽어 batch로 저장합니다(재개 지점 없음 — 실패하면 다음 실행이 처음부터 다시 읽습니다).
 *
 * @returns 완료 증거 {kind:'geeknews', entryCount, uniqueCount}
 */
export const collectGeeknews = async ({ ingest, fetchImpl = fetch, sleep = defaultSleep, now = Date.now, deadline = Number.POSITIVE_INFINITY, log = () => {} }) => {
	if (now() >= deadline) {
		throw new SourceError("time_limit", "시간 제한에 도달했습니다");
	}

	const xml = await fetchGeeknewsFeed({ fetchImpl, sleep });
	const { articles, entryCount } = parseGeeknewsFeed(xml);

	for (let index = 0; index < articles.length; index += BATCH_SIZE) {
		await ingest.batch(articles.slice(index, index + BATCH_SIZE));
	}

	log(`긱뉴스 피드 저장: 엔트리 ${entryCount}개, 고유 글 ${articles.length}개`);

	return { kind: "geeknews", entryCount, uniqueCount: articles.length };
};
