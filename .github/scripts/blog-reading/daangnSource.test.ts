import { describe, expect, it, vi } from "vitest";

import { collectDaangn, smokeDaangn } from "./daangnSource.mjs";

const IDS = Array.from({ length: 12 }, (_, index) => (0xb00000000000 + index * 7919).toString(16).padStart(12, "0"));

const nodeOf = (id: string) => ({
	__typename: "Post",
	id,
	title: `글 ${id}`,
	mediumUrl: `https://medium.com/daangn/slug-${id}`,
	firstPublishedAt: 1_681_376_414_297,
});

const graphqlBody = ({ ids, hasNextPage, endCursor }: { ids: string[]; hasNextPage: boolean; endCursor: string }) => [
	{ data: { publication: { postsConnection: { edges: ids.map((id) => ({ node: nodeOf(id) })), pageInfo: { hasNextPage, endCursor } } } } },
];

const requestOf = (after: string) => [
	{ operationName: "PublicationContentDataQuery", variables: { ref: { slug: "daangn", domain: null }, first: 10, after, orderBy: { publishedAt: "ASC" }, filter: { published: true } } },
];

type TScript = { after: string; body: ReturnType<typeof graphqlBody> };

/** Playwright를 흉내 낸다. 스크롤(evaluate)할 때마다 script의 다음 GraphQL 응답을 화면이 보낸 것처럼 흘려 준다 */
const createFakeChromium = ({
	navigationStatus = 200,
	title = "Daangn – Medium",
	apolloState = {},
	script = [],
	hrefs = [],
	onClose = () => {},
}: {
	navigationStatus?: number;
	title?: string;
	apolloState?: Record<string, unknown>;
	script?: TScript[];
	hrefs?: string[];
	onClose?: () => void;
}) => {
	let handler: ((response: unknown) => void) | null = null;
	let cursor = 0;
	const page = {
		on: (event: string, listener: (response: unknown) => void) => {
			if (event === "response") {
				handler = listener;
			}
		},
		goto: async () => ({ status: () => navigationStatus, headers: () => ({}) }),
		title: async () => title,
		content: async () => "<html></html>",
		evaluate: async (fn: () => unknown) => {
			if (String(fn).includes("__APOLLO_STATE__")) {
				return apolloState;
			}

			const next = script[cursor];

			if (next && handler) {
				cursor += 1;
				handler({
					url: () => "https://medium.com/_/graphql",
					status: () => 200,
					request: () => ({ postData: () => JSON.stringify(requestOf(next.after)) }),
					json: async () => next.body,
				});
			}

			return undefined;
		},
		$$eval: async () => hrefs,
	};

	return {
		launch: async () => ({
			newContext: async () => ({ newPage: async () => page }),
			close: async () => onClose(),
		}),
	};
};

const createIngest = () => ({ batch: vi.fn(async () => ({})), checkpoint: vi.fn(async () => ({})) });

describe("collectDaangn", () => {
	it("종료 응답(hasNextPage=false, 빈 endCursor)을 받으면 완료 증거를 만들고 배치로 저장한다", async () => {
		const ingest = createIngest();
		const onClose = vi.fn();
		const chromium = createFakeChromium({
			apolloState: { a: nodeOf(IDS[0]), b: nodeOf(IDS[1]) },
			script: [
				{ after: "c0", body: graphqlBody({ ids: IDS.slice(2, 5), hasNextPage: true, endCursor: "c1" }) },
				{ after: "c1", body: graphqlBody({ ids: IDS.slice(5, 7), hasNextPage: false, endCursor: "" }) },
			],
			hrefs: [`https://medium.com/daangn/slug-${IDS[3]}`],
			onClose,
		});

		const evidence = await collectDaangn({ ingest, chromium, sleep: async () => {} });

		expect(evidence).toEqual({ kind: "daangn", hasNextPage: false, endCursor: "", uniqueCount: 7 });
		expect(ingest.batch.mock.calls.flatMap((call) => call[0])).toHaveLength(7);
		expect(onClose).toHaveBeenCalled();
	});

	it("종료 응답 없이 스크롤 응답이 멈추면 완료하지 않고 network로 실패한다", async () => {
		let clock = 0;
		const chromium = createFakeChromium({
			apolloState: { a: nodeOf(IDS[0]) },
			script: [{ after: "c0", body: graphqlBody({ ids: IDS.slice(1, 4), hasNextPage: true, endCursor: "c1" }) }],
		});

		await expect(
			collectDaangn({
				ingest: createIngest(),
				chromium,
				now: () => clock,
				sleep: async () => {
					clock += 30_000;
				},
				stallLimitMs: 60_000,
			}),
		).rejects.toMatchObject({ code: "network" });
	});

	it("마감 시각이 지나면 time_limit과 진행 상황을 남긴다", async () => {
		const chromium = createFakeChromium({ apolloState: { a: nodeOf(IDS[0]) }, script: [] });

		await expect(collectDaangn({ ingest: createIngest(), chromium, now: () => 10, deadline: 5, sleep: async () => {} })).rejects.toMatchObject({
			code: "time_limit",
			checkpoint: { uniqueCount: 1, responses: 0 },
		});
	});

	it("페이지가 403이면 우회하지 않고 blocked로 던지고 브라우저를 닫는다", async () => {
		const onClose = vi.fn();
		const chromium = createFakeChromium({ navigationStatus: 403, title: "Just a moment...", onClose });

		await expect(collectDaangn({ ingest: createIngest(), chromium, sleep: async () => {} })).rejects.toMatchObject({ code: "blocked" });
		expect(onClose).toHaveBeenCalled();
	});

	it("화면에는 있는데 응답 파싱에서 빠진 글이 있으면 완료 증거를 만들지 않는다", async () => {
		const chromium = createFakeChromium({
			apolloState: { a: nodeOf(IDS[0]) },
			script: [{ after: "c0", body: graphqlBody({ ids: IDS.slice(1, 3), hasNextPage: false, endCursor: "" }) }],
			hrefs: [`https://medium.com/daangn/slug-${IDS[9]}`],
		});

		await expect(collectDaangn({ ingest: createIngest(), chromium, sleep: async () => {} })).rejects.toMatchObject({ code: "schema_changed" });
	});

	it("응답 모양이 바뀌면 schema_changed", async () => {
		const chromium = createFakeChromium({
			apolloState: { a: nodeOf(IDS[0]) },
			script: [{ after: "c0", body: [{ data: { publication: { unexpected: true } } }] as never }],
		});

		await expect(collectDaangn({ ingest: createIngest(), chromium, sleep: async () => {} })).rejects.toMatchObject({ code: "schema_changed" });
	});
});

describe("smokeDaangn", () => {
	it("접근 가능하고 글을 읽으면 통과한다", async () => {
		const chromium = createFakeChromium({
			apolloState: { a: nodeOf(IDS[0]), b: nodeOf(IDS[1]) },
			script: [{ after: "c0", body: graphqlBody({ ids: IDS.slice(2, 4), hasNextPage: true, endCursor: "c1" }) }],
		});

		await expect(smokeDaangn({ chromium, sleep: async () => {} })).resolves.toMatchObject({ ok: true, initialArticles: 2, graphqlResponses: 1, uniqueArticles: 4 });
	});

	it("차단이면 blocked, 글을 하나도 못 읽으면 schema_changed", async () => {
		await expect(smokeDaangn({ chromium: createFakeChromium({ navigationStatus: 403 }), sleep: async () => {} })).rejects.toMatchObject({ code: "blocked" });
		await expect(smokeDaangn({ chromium: createFakeChromium({}), sleep: async () => {} })).rejects.toMatchObject({ code: "schema_changed" });
	});
});
