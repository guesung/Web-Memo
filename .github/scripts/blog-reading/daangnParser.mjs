/**
 * 당근 기술 블로그(medium.com/daangn) 공개 목록의 순수 파서. 브라우저에 의존하지 않아 fixture로 검증합니다.
 * Medium 내부 GraphQL(PublicationContentDataQuery)은 공식 지원 API가 아니므로, 모양이 기대와 다르면 조용히 넘기지 않고
 * schema_changed로 던집니다. 종료는 DOM 개수가 아니라 pageInfo(hasNextPage=false, endCursor 비어 있음)로만 판단합니다.
 */

import { SourceError } from "./sourceError.mjs";

export const DAANGN_ALL_URL = "https://medium.com/daangn/all?orderBy=earliest";
export const DAANGN_ARTICLE_URL_PREFIX = "https://medium.com/daangn/";
export const DAANGN_OPERATION_NAME = "PublicationContentDataQuery";
export const DAANGN_PUBLICATION_SLUG = "daangn";

const POST_ID_PATTERN = /^[0-9a-f]{10,12}$/;
const TRAILING_POST_ID_PATTERN = /(?:^|-)([0-9a-f]{10,12})$/;
const MAX_SEARCH_DEPTH = 8;

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

const toIsoFromMillis = (value, label) => {
	if (value === null || value === undefined) {
		return null;
	}

	if (!Number.isFinite(value) || value <= 0) {
		throw new SourceError("schema_changed", `당근 ${label} 시각을 해석할 수 없습니다`);
	}

	return new Date(value).toISOString();
};

/** 글 URL에서 query·hash를 뗀 정식 주소. medium.com/daangn/ 아래가 아니면 null */
export const canonicalizeDaangnUrl = (rawUrl) => {
	if (typeof rawUrl !== "string") {
		return null;
	}

	let url;

	try {
		url = new URL(rawUrl, "https://medium.com");
	} catch {
		return null;
	}

	const canonical = `${url.origin}${url.pathname}`;

	if (url.protocol !== "https:" || !canonical.startsWith(DAANGN_ARTICLE_URL_PREFIX) || canonical === DAANGN_ARTICLE_URL_PREFIX) {
		return null;
	}

	return canonical;
};

/** 글 URL 끝의 Medium 글 ID(10~12자리 hex)를 뽑습니다. 없으면 null */
export const extractPostIdFromUrl = (rawUrl) => {
	const canonical = canonicalizeDaangnUrl(rawUrl);

	if (canonical === null) {
		return null;
	}

	const lastSegment = canonical.slice(DAANGN_ARTICLE_URL_PREFIX.length).split("/").pop() ?? "";

	return TRAILING_POST_ID_PATTERN.exec(lastSegment)?.[1] ?? null;
};

/** GraphQL/Apollo 노드 하나를 저장할 메타로 바꿉니다. 필수 값이 없으면 던집니다 */
export const toDaangnArticle = (node) => {
	if (!isObject(node) || typeof node.id !== "string" || !POST_ID_PATTERN.test(node.id)) {
		throw new SourceError("schema_changed", "당근 글 노드에 올바른 id가 없습니다");
	}

	if (typeof node.title !== "string" || node.title.trim() === "") {
		throw new SourceError("schema_changed", "당근 글 노드에 title이 없습니다");
	}

	const slugUrl = typeof node.uniqueSlug === "string" ? `${DAANGN_ARTICLE_URL_PREFIX}${node.uniqueSlug}` : null;
	const url = [node.mediumUrl, node.url, node.canonicalUrl, slugUrl].map(canonicalizeDaangnUrl).find((candidate) => candidate !== null);

	if (!url) {
		throw new SourceError("schema_changed", "당근 글 노드에서 글 주소를 찾지 못했습니다");
	}

	return {
		providerId: node.id,
		title: node.title.trim(),
		url,
		publishedAt: toIsoFromMillis(node.firstPublishedAt ?? node.latestPublishedAt ?? node.listedAt, "게시"),
		updatedAt: toIsoFromMillis(node.latestPublishedAt ?? node.updatedAt, "수정"),
		aliasUrls: [`https://medium.com/p/${node.id}`],
	};
};

const findConnections = (value, depth, found) => {
	if (depth > MAX_SEARCH_DEPTH || value === null || typeof value !== "object") {
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			findConnections(entry, depth + 1, found);
		}

		return;
	}

	if (isObject(value.pageInfo) && Array.isArray(value.edges)) {
		found.push(value);

		return;
	}

	for (const child of Object.values(value)) {
		findConnections(child, depth + 1, found);
	}
};

/**
 * GraphQL 응답 한 건({data})에서 목록 connection을 찾아 글과 pageInfo를 돌려줍니다.
 * connection이 없거나 둘 이상이면 schema_changed입니다.
 */
export const parseDaangnConnection = (result) => {
	const connections = [];

	findConnections(result?.data, 0, connections);

	if (connections.length !== 1) {
		throw new SourceError("schema_changed", `당근 응답에서 목록 connection ${connections.length}개를 찾았습니다(1개여야 합니다)`);
	}

	const [connection] = connections;
	const { hasNextPage, endCursor } = connection.pageInfo;

	if (typeof hasNextPage !== "boolean" || !(endCursor === null || typeof endCursor === "string")) {
		throw new SourceError("schema_changed", "당근 pageInfo 모양이 기대와 다릅니다");
	}

	const articles = connection.edges.map((edge) => toDaangnArticle(isObject(edge?.node) ? edge.node : edge));

	return { articles, pageInfo: { hasNextPage, endCursor: endCursor ?? "" } };
};

/**
 * 요청 본문(단일 또는 배치)과 응답 본문을 짝지어, PublicationContentDataQuery 중 daangn 오름차순 전체 목록만 골라냅니다.
 * 다른 연산이나 다른 publication의 응답은 무시합니다.
 */
export const pairGraphqlOperations = ({ requestBody, responseBody }) => {
	const operations = Array.isArray(requestBody) ? requestBody : [requestBody];
	const results = Array.isArray(responseBody) ? responseBody : [responseBody];
	const paired = [];

	operations.forEach((operation, index) => {
		const variables = operation?.variables;
		const isTarget =
			operation?.operationName === DAANGN_OPERATION_NAME &&
			variables?.ref?.slug === DAANGN_PUBLICATION_SLUG &&
			variables?.orderBy?.publishedAt === "ASC" &&
			variables?.filter?.published === true &&
			!variables?.filter?.between;

		if (isTarget && results[index] !== undefined) {
			paired.push({ variables, result: results[index] });
		}
	});

	return paired;
};

/**
 * 초기 렌더에 실린 첫 페이지 글을 Apollo 상태에서 읽습니다(첫 10개는 GraphQL 요청 없이 HTML로 오는 것으로 관측됨).
 * medium.com/daangn/ 글만 남기고 ID로 중복을 제거합니다. 필드가 덜 채워진 항목은 건너뜁니다.
 */
export const extractApolloArticles = (apolloState) => {
	if (!isObject(apolloState)) {
		return [];
	}

	const byId = new Map();

	for (const value of Object.values(apolloState)) {
		const isPost = isObject(value) && value.__typename === "Post" && typeof value.id === "string";

		if (!isPost || (!value.mediumUrl && !value.uniqueSlug && !value.url && !value.canonicalUrl)) {
			continue;
		}

		const slugUrl = typeof value.uniqueSlug === "string" ? `${DAANGN_ARTICLE_URL_PREFIX}${value.uniqueSlug}` : null;
		const belongsToDaangn = [value.mediumUrl, value.url, value.canonicalUrl, slugUrl].some((candidate) => canonicalizeDaangnUrl(candidate) !== null);

		if (!belongsToDaangn || byId.has(value.id)) {
			continue;
		}

		// Apollo 캐시에는 일부 필드만 채워진 글이 섞일 수 있습니다. 게시 시각이 없거나 해석할 수 없으면 건너뛰고,
		// 화면에 보이는데 빠진 글은 findMissingDomArticleIds가 잡아 완료를 막습니다.
		try {
			const article = toDaangnArticle(value);

			if (article.publishedAt !== null) {
				byId.set(value.id, article);
			}
		} catch (error) {
			if (!(error instanceof SourceError)) {
				throw error;
			}
		}
	}

	return [...byId.values()];
};

/** Cloudflare 등이 사람 확인 화면이나 차단 응답을 준 것으로 보이는지. 우회하지 않고 blocked로 기록하기 위한 판정입니다 */
export const looksBlocked = ({ status, title = "", bodySnippet = "", headers = {} }) => {
	if (status === 401 || status === 403 || status === 429 || status === 503) {
		return true;
	}

	return (
		headers["cf-mitigated"] !== undefined ||
		/just a moment|attention required|access denied/i.test(title) ||
		/error code: 10\d\d|cf-browser-verification|challenge-platform/i.test(bodySnippet)
	);
};

/**
 * 연속 로딩 응답을 모아 순회 상태를 판정합니다.
 * - 종료는 hasNextPage=false와 빈 endCursor를 가진 응답을 받았을 때만 성립합니다.
 * - 응답의 after cursor는 첫 응답(초기 렌더가 끝난 지점)이 아니면 앞선 응답의 endCursor여야 합니다. 끊기면 누락 위험이라 던집니다.
 */
export const createDaangnAccumulator = () => {
	const articles = new Map();
	const knownCursors = new Set();
	const seenAfters = new Set();
	const pending = [];
	let firstAfter;
	let terminal = null;
	let responseCount = 0;
	let lastEndCursor = "";

	const addArticle = (article) => {
		if (articles.has(article.providerId)) {
			return;
		}

		articles.set(article.providerId, article);
		pending.push(article);
	};

	return {
		/** 초기 렌더의 글을 더합니다 */
		addInitialArticles: (initialArticles) => {
			for (const article of initialArticles) {
				addArticle(article);
			}
		},
		/** 목록 응답 하나를 더합니다. 같은 after의 중복 응답은 무시합니다 */
		addResponse: ({ variables, result }) => {
			const after = typeof variables.after === "string" ? variables.after : "";

			if (seenAfters.has(after)) {
				return;
			}

			if (responseCount === 0) {
				firstAfter = after;
			} else if (!knownCursors.has(after)) {
				throw new SourceError("schema_changed", "당근 응답의 cursor 사슬이 끊겼습니다(누락 위험)");
			}

			const { articles: pageArticles, pageInfo } = parseDaangnConnection(result);

			if (!pageInfo.hasNextPage && pageInfo.endCursor !== "") {
				throw new SourceError("schema_changed", "당근 마지막 응답의 endCursor가 비어 있지 않습니다");
			}

			if (pageInfo.hasNextPage && pageInfo.endCursor === "") {
				throw new SourceError("schema_changed", "당근 응답이 다음 페이지가 있다면서 endCursor가 없습니다");
			}

			seenAfters.add(after);
			responseCount += 1;
			lastEndCursor = pageInfo.endCursor;

			if (pageInfo.hasNextPage) {
				knownCursors.add(pageInfo.endCursor);
			} else {
				terminal = { hasNextPage: false, endCursor: "" };
			}

			for (const article of pageArticles) {
				addArticle(article);
			}
		},
		/** 아직 서버에 보내지 않은 글을 꺼냅니다 */
		takePending: () => pending.splice(0, pending.length),
		get isComplete() {
			return terminal !== null;
		},
		get responseCount() {
			return responseCount;
		},
		get uniqueCount() {
			return articles.size;
		},
		get firstAfter() {
			return firstAfter;
		},
		get lastEndCursor() {
			return lastEndCursor;
		},
		hasArticle: (providerId) => articles.has(providerId),
		/** 종료 증거. 종료 응답을 받기 전에는 만들 수 없습니다 */
		buildEvidence: () => {
			if (terminal === null) {
				throw new SourceError("internal", "종료 응답 없이 완료 증거를 만들 수 없습니다");
			}

			return { kind: "daangn", hasNextPage: false, endCursor: "", uniqueCount: articles.size };
		},
	};
};

/**
 * DOM 링크와 수집 결과를 대조하는 안전장치(종료 판정에는 쓰지 않습니다).
 * 화면에 보이는 daangn 글 ID가 수집 결과에 없으면 파서가 놓친 것이므로 완료를 막습니다.
 */
export const findMissingDomArticleIds = ({ hrefs, hasArticle }) => {
	const missing = new Set();

	for (const href of hrefs) {
		const postId = extractPostIdFromUrl(href);

		if (postId !== null && !hasArticle(postId)) {
			missing.add(postId);
		}
	}

	return [...missing];
};
