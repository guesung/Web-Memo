import { describe, expect, it } from "vitest";

import {
	canonicalizeDaangnUrl,
	createDaangnAccumulator,
	extractApolloArticles,
	extractPostIdFromUrl,
	findMissingDomArticleIds,
	looksBlocked,
	pairGraphqlOperations,
	parseDaangnConnection,
	toDaangnArticle,
} from "./daangnParser.mjs";

const POST_IDS = Array.from({ length: 30 }, (_, index) => (0xa00000000000 + index * 4099).toString(16).padStart(12, "0"));

const node = (id: string) => ({
	__typename: "Post",
	id,
	title: `당근 글 ${id}`,
	mediumUrl: `https://medium.com/daangn/%EA%B8%80-${id}?source=collection_home---4------1-----------`,
	firstPublishedAt: 1_681_376_414_297,
	latestPublishedAt: 1_681_376_470_964,
});

const connectionResult = ({ ids, hasNextPage, endCursor }: { ids: string[]; hasNextPage: boolean; endCursor: string }) => ({
	data: {
		publication: {
			__typename: "Collection",
			homepagePostsConnection: {
				__typename: "PostsConnection",
				edges: ids.map((id) => ({ __typename: "PostEdge", node: node(id) })),
				pageInfo: { __typename: "PageInfoV2", hasNextPage, endCursor },
			},
		},
	},
});

const variables = (after: string | null) => ({
	ref: { slug: "daangn", domain: null },
	first: 10,
	after,
	orderBy: { publishedAt: "ASC" },
	filter: { published: true },
});

describe("URL/ID 헬퍼", () => {
	it("query·hash를 떼고 daangn 글만 정식 주소로 인정한다", () => {
		expect(canonicalizeDaangnUrl("https://medium.com/daangn/slug-aea44d0b7b7?source=rss#x")).toBe("https://medium.com/daangn/slug-aea44d0b7b7");
		expect(canonicalizeDaangnUrl("https://medium.com/other/slug-aea44d0b7b7")).toBeNull();
		expect(canonicalizeDaangnUrl("http://medium.com/daangn/slug")).toBeNull();
		expect(canonicalizeDaangnUrl("https://medium.com/daangn/")).toBeNull();
		expect(canonicalizeDaangnUrl(undefined)).toBeNull();
	});

	it("URL 끝의 글 ID를 뽑는다", () => {
		expect(extractPostIdFromUrl("https://medium.com/daangn/%EA%B3%B5-aea44d0b7b7")).toBe("aea44d0b7b7");
		expect(extractPostIdFromUrl("https://medium.com/daangn/slug-3fa344b4391b?source=x")).toBe("3fa344b4391b");
		expect(extractPostIdFromUrl("https://medium.com/daangn/no-id")).toBeNull();
		expect(extractPostIdFromUrl("https://medium.com/daangn/all")).toBeNull();
	});
});

describe("toDaangnArticle", () => {
	it("메타만 남기고 본문성 필드는 버린다", () => {
		const article = toDaangnArticle({ ...node(POST_IDS[0]), content: "본문", subtitle: "요약", virtuals: { totalClapCount: 3 } });

		expect(Object.keys(article).sort()).toEqual(["aliasUrls", "providerId", "publishedAt", "title", "updatedAt", "url"]);
		expect(article.url).toBe(`https://medium.com/daangn/%EA%B8%80-${POST_IDS[0]}`);
		expect(article.publishedAt).toBe(new Date(1_681_376_414_297).toISOString());
		expect(article.aliasUrls).toEqual([`https://medium.com/p/${POST_IDS[0]}`]);
	});

	it("uniqueSlug만 있어도 주소를 만든다", () => {
		const article = toDaangnArticle({ id: POST_IDS[1], title: "t", uniqueSlug: `slug-${POST_IDS[1]}`, firstPublishedAt: 1 });

		expect(article.url).toBe(`https://medium.com/daangn/slug-${POST_IDS[1]}`);
	});

	it.each([
		[{ title: "t", mediumUrl: "https://medium.com/daangn/x-aea44d0b7b7" }],
		[{ id: "ZZZ", title: "t", mediumUrl: "https://medium.com/daangn/x-aea44d0b7b7" }],
		[{ id: "aea44d0b7b7", title: " ", mediumUrl: "https://medium.com/daangn/x-aea44d0b7b7" }],
		[{ id: "aea44d0b7b7", title: "t" }],
		[{ id: "aea44d0b7b7", title: "t", mediumUrl: "https://evil.example/daangn/x" }],
		[{ id: "aea44d0b7b7", title: "t", mediumUrl: "https://medium.com/daangn/x", firstPublishedAt: -5 }],
	])("스키마가 다르면 schema_changed: %j", (input) => {
		expect(() => toDaangnArticle(input)).toThrowError(expect.objectContaining({ code: "schema_changed" }));
	});
});

describe("parseDaangnConnection", () => {
	it("edges와 pageInfo를 읽는다", () => {
		const parsed = parseDaangnConnection(connectionResult({ ids: POST_IDS.slice(0, 3), hasNextPage: true, endCursor: "c1" }));

		expect(parsed.articles).toHaveLength(3);
		expect(parsed.pageInfo).toEqual({ hasNextPage: true, endCursor: "c1" });
	});

	it("빈 endCursor(마지막)를 그대로 읽는다", () => {
		expect(parseDaangnConnection(connectionResult({ ids: POST_IDS.slice(0, 3), hasNextPage: false, endCursor: "" })).pageInfo).toEqual({ hasNextPage: false, endCursor: "" });
	});

	it("connection이 없거나 둘이면 schema_changed", () => {
		expect(() => parseDaangnConnection({ data: { publication: {} } })).toThrowError(expect.objectContaining({ code: "schema_changed" }));
		expect(() => parseDaangnConnection({ data: { a: { edges: [], pageInfo: { hasNextPage: false, endCursor: "" } }, b: { edges: [], pageInfo: { hasNextPage: false, endCursor: "" } } } })).toThrow();
		expect(() => parseDaangnConnection({ data: { a: { edges: [], pageInfo: { hasNextPage: "no", endCursor: "" } } } })).toThrow();
	});
});

describe("pairGraphqlOperations", () => {
	it("배치 요청에서 daangn 오름차순 전체 목록만 짝짓는다", () => {
		const target = { operationName: "PublicationContentDataQuery", variables: variables("c1") };
		const other = { operationName: "SomethingElse", variables: {} };
		const yearFiltered = { operationName: "PublicationContentDataQuery", variables: { ...variables("c1"), filter: { published: true, between: { start: 1, end: 2 } } } };
		const otherPublication = { operationName: "PublicationContentDataQuery", variables: { ...variables("c1"), ref: { slug: "other" } } };

		const paired = pairGraphqlOperations({ requestBody: [other, target, yearFiltered, otherPublication], responseBody: [{}, { data: 1 }, { data: 2 }, { data: 3 }] });

		expect(paired).toEqual([{ variables: target.variables, result: { data: 1 } }]);
	});

	it("단일 요청/응답도 처리한다", () => {
		const paired = pairGraphqlOperations({ requestBody: { operationName: "PublicationContentDataQuery", variables: variables(null) }, responseBody: { data: {} } });

		expect(paired).toHaveLength(1);
	});
});

describe("extractApolloArticles", () => {
	it("daangn 글만 ID로 중복 없이 뽑고, 덜 채워진 항목은 건너뛴다", () => {
		const state = {
			"Post:1": node(POST_IDS[0]),
			"Post:dup": node(POST_IDS[0]),
			"Post:2": node(POST_IDS[1]),
			"Post:partial": { __typename: "Post", id: POST_IDS[2], title: "부분", mediumUrl: `https://medium.com/daangn/x-${POST_IDS[2]}` },
			"Post:foreign": { ...node(POST_IDS[3]), mediumUrl: `https://medium.com/other/x-${POST_IDS[3]}` },
			ROOT_QUERY: {},
		};

		expect(extractApolloArticles(state).map((article) => article.providerId).sort()).toEqual([POST_IDS[0], POST_IDS[1]].sort());
		expect(extractApolloArticles(null)).toEqual([]);
	});
});

describe("createDaangnAccumulator", () => {
	it("hasNextPage=false와 빈 endCursor 응답을 받아야만 완료다", () => {
		const acc = createDaangnAccumulator();

		acc.addInitialArticles(extractApolloArticles({ a: node(POST_IDS[0]), b: node(POST_IDS[1]) }));
		acc.addResponse({ variables: variables("c0"), result: connectionResult({ ids: POST_IDS.slice(2, 4), hasNextPage: true, endCursor: "c1" }) });

		expect(acc.isComplete).toBe(false);
		expect(() => acc.buildEvidence()).toThrow();

		acc.addResponse({ variables: variables("c1"), result: connectionResult({ ids: POST_IDS.slice(4, 5), hasNextPage: false, endCursor: "" }) });

		expect(acc.isComplete).toBe(true);
		expect(acc.buildEvidence()).toEqual({ kind: "daangn", hasNextPage: false, endCursor: "", uniqueCount: 5 });
	});

	it("DOM 글 수가 멈춘 것만으로는 완료가 되지 않는다 (종료 응답 없이 응답이 끝남)", () => {
		const acc = createDaangnAccumulator();

		acc.addResponse({ variables: variables("c0"), result: connectionResult({ ids: POST_IDS.slice(0, 10), hasNextPage: true, endCursor: "c1" }) });

		expect(acc.isComplete).toBe(false);
		expect(acc.uniqueCount).toBe(10);
	});

	it("중복 응답과 중복 글은 한 번만 센다", () => {
		const acc = createDaangnAccumulator();
		const response = { variables: variables("c0"), result: connectionResult({ ids: POST_IDS.slice(0, 3), hasNextPage: true, endCursor: "c1" }) };

		acc.addResponse(response);
		acc.addResponse(response);

		expect(acc.responseCount).toBe(1);
		expect(acc.takePending()).toHaveLength(3);
		expect(acc.takePending()).toHaveLength(0);
	});

	it("cursor 사슬이 끊기면 누락 위험이라 던진다", () => {
		const acc = createDaangnAccumulator();

		acc.addResponse({ variables: variables("c0"), result: connectionResult({ ids: POST_IDS.slice(0, 2), hasNextPage: true, endCursor: "c1" }) });

		expect(() => acc.addResponse({ variables: variables("c9"), result: connectionResult({ ids: POST_IDS.slice(2, 4), hasNextPage: true, endCursor: "c10" }) })).toThrowError(
			expect.objectContaining({ code: "schema_changed" }),
		);
	});

	it("마지막 응답의 endCursor가 비어 있지 않거나, 다음 페이지가 있는데 endCursor가 없으면 거절한다", () => {
		const closing = createDaangnAccumulator();
		const opening = createDaangnAccumulator();

		expect(() => closing.addResponse({ variables: variables("c0"), result: connectionResult({ ids: POST_IDS.slice(0, 1), hasNextPage: false, endCursor: "still" }) })).toThrow();
		expect(() => opening.addResponse({ variables: variables("c0"), result: connectionResult({ ids: POST_IDS.slice(0, 1), hasNextPage: true, endCursor: "" }) })).toThrow();
	});
});

describe("findMissingDomArticleIds / looksBlocked", () => {
	it("화면에 있으나 수집에 없는 글 ID를 찾는다", () => {
		const collected = new Set([POST_IDS[0]]);
		const hrefs = [`https://medium.com/daangn/a-${POST_IDS[0]}`, `https://medium.com/daangn/b-${POST_IDS[1]}?x=1`, "https://medium.com/daangn/about", "https://medium.com/other/c-aea44d0b7b7"];

		expect(findMissingDomArticleIds({ hrefs, hasArticle: (id: string) => collected.has(id) })).toEqual([POST_IDS[1]]);
	});

	it("403/확인 화면은 차단으로 본다", () => {
		expect(looksBlocked({ status: 403 })).toBe(true);
		expect(looksBlocked({ status: 200, title: "Just a moment..." })).toBe(true);
		expect(looksBlocked({ status: 200, bodySnippet: "error code: 1010" })).toBe(true);
		expect(looksBlocked({ status: 200, headers: { "cf-mitigated": "challenge" } })).toBe(true);
		expect(looksBlocked({ status: 200, title: "당근 Medium" })).toBe(false);
	});
});
