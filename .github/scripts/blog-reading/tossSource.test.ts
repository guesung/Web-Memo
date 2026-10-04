import { describe, expect, it, vi } from "vitest";

import { collectToss, fetchTossPageJson, parseTossPage, resolveNextPageUrl, TOSS_FIRST_PAGE_URL, toTossArticle } from "./tossSource.mjs";

const NEXT = (page: number) => `/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=${page}&size=100`;

const buildItem = (id: number) => ({
	id,
	key: `post-${id}`,
	title: `글 ${id}`,
	subtitle: "부제",
	fullDescription: "<p>본문은 저장하지 않는다</p>",
	publishedTime: "2021-04-28T08:00:00+09:00",
	updatedTime: "2026-01-01T00:00:00+09:00",
});

const buildPageBody = ({ page, count, ids, next }: { page: number; count: number; ids: number[]; next: string | null }) => ({
	resultType: "SUCCESS",
	error: null,
	success: { page, pageSize: 100, count, next, previous: null, results: ids.map(buildItem) },
});

/** 총 개수를 테스트 안에서만 정해 페이지로 나눈다. 코드에는 어떤 총량도 없다 */
const buildPages = (total: number) => {
	const pageCount = Math.ceil(total / 100);

	return Array.from({ length: pageCount }, (_, index) => {
		const start = index * 100;
		const ids = Array.from({ length: Math.min(100, total - start) }, (_, offset) => start + offset + 1);

		return buildPageBody({ page: index + 1, count: total, ids, next: index + 1 < pageCount ? NEXT(index + 2) : null });
	});
};

const createFetch = (pages: unknown[]) =>
	vi.fn(async (url: string) => {
		const page = Number(new URL(url).searchParams.get("page"));

		return new Response(JSON.stringify(pages[page - 1]), { status: 200 });
	});

const createIngest = () => ({ batch: vi.fn(async () => ({})), checkpoint: vi.fn(async () => ({})) });

describe("resolveNextPageUrl", () => {
	it("next=null이면 마지막이다", () => {
		expect(resolveNextPageUrl({ next: null, expectedPage: 2 })).toBeNull();
	});

	it("같은 API의 다음 페이지 상대 경로를 절대 URL로 만든다", () => {
		expect(resolveNextPageUrl({ next: NEXT(2), expectedPage: 2 })).toBe("https://api-public.toss.im/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2&size=100");
	});

	it.each([
		["다른 호스트", "https://evil.example/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2&size=100"],
		["프로토콜 상대 호스트", "//evil.example/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2&size=100"],
		["userinfo 우회", "https://api-public.toss.im@evil.example/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2&size=100"],
		["http", "http://api-public.toss.im/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2&size=100"],
		["다른 경로", "/api-public/v3/ipd-thor/api/v1/workspaces/16/posts?page=2&size=100"],
		["경로 접미", "/api-public/v3/ipd-thor/api/v1/workspaces/15/posts/../secret?page=2&size=100"],
		["추가 파라미터", `${NEXT(2)}&token=x`],
		["파라미터 누락", "/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2"],
		["size 변경", "/api-public/v3/ipd-thor/api/v1/workspaces/15/posts?page=2&size=1000"],
		["page 건너뜀", NEXT(3)],
		["fragment", `${NEXT(2)}#x`],
	])("허용되지 않는 next를 거절한다: %s", (_name, next) => {
		expect(() => resolveNextPageUrl({ next, expectedPage: 2 })).toThrowError(expect.objectContaining({ code: "schema_changed" }));
	});

	it("문자열이 아닌 next는 거절한다", () => {
		expect(() => resolveNextPageUrl({ next: 3 as unknown as string, expectedPage: 2 })).toThrow();
		expect(() => resolveNextPageUrl({ next: "", expectedPage: 2 })).toThrow();
	});
});

describe("toTossArticle / parseTossPage", () => {
	it("메타만 남기고 본문을 버린다", () => {
		const article = toTossArticle(buildItem(7));

		expect(Object.keys(article).sort()).toEqual(["aliasUrls", "providerId", "publishedAt", "title", "updatedAt", "url"]);
		expect(article).toMatchObject({
			providerId: "7",
			url: "https://toss.tech/article/post-7",
			aliasUrls: ["https://toss.tech/article/7"],
			publishedAt: "2021-04-27T23:00:00.000Z",
		});
		expect(JSON.stringify(article)).not.toContain("본문");
	});

	it("key가 없으면 id로 URL을 만들고 별칭은 두지 않는다", () => {
		const article = toTossArticle({ id: 9, key: null, title: "t", publishedTime: null, updatedTime: null });

		expect(article.url).toBe("https://toss.tech/article/9");
		expect(article.aliasUrls).toEqual([]);
		expect(article.publishedAt).toBeNull();
	});

	it.each([
		[{ id: "x", title: "t" }],
		[{ id: 1, title: " " }],
		[{ id: 1, title: "t", publishedTime: "not a date" }],
	])("필수 값이 없거나 형식이 다르면 schema_changed: %j", (item) => {
		expect(() => toTossArticle(item)).toThrowError(expect.objectContaining({ code: "schema_changed" }));
	});

	it("응답 스키마가 다르면 던진다", () => {
		const valid = buildPageBody({ page: 1, count: 1, ids: [1], next: null });

		expect(parseTossPage(valid, { expectedPage: 1 }).articles).toHaveLength(1);
		expect(() => parseTossPage({ ...valid, resultType: "FAIL" }, { expectedPage: 1 })).toThrow();
		expect(() => parseTossPage(valid, { expectedPage: 2 })).toThrow();
		expect(() => parseTossPage({ resultType: "SUCCESS", success: { ...valid.success, results: "x" } }, { expectedPage: 1 })).toThrow();
		expect(() => parseTossPage(null, { expectedPage: 1 })).toThrow();
	});
});

describe("collectToss", () => {
	it("next=null까지 순회하고 count와 고유 수가 같으면 완료 증거를 만든다 (총량은 코드에 없다)", async () => {
		for (const total of [1, 100, 101, 250, 777]) {
			const ingest = createIngest();
			const evidence = await collectToss({ ingest, fetchImpl: createFetch(buildPages(total)) as unknown as typeof fetch, sleep: async () => {} });

			expect(evidence).toEqual({ kind: "toss", nextIsNull: true, reportedCount: total, uniqueCount: total, pageCount: Math.ceil(total / 100) });
			expect(ingest.batch.mock.calls.flatMap((call) => call[0])).toHaveLength(total);
		}
	});

	it("첫 요청은 고정된 첫 페이지 URL이다", async () => {
		const fetchImpl = createFetch(buildPages(3));

		await collectToss({ ingest: createIngest(), fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {} });

		expect(fetchImpl.mock.calls[0][0]).toBe(TOSS_FIRST_PAGE_URL);
	});

	it("페이지를 저장한 뒤에 checkpoint를 갱신한다", async () => {
		const order: string[] = [];
		const ingest = {
			batch: vi.fn(async () => void order.push("batch")),
			checkpoint: vi.fn(async () => void order.push("checkpoint")),
		};

		await collectToss({ ingest, fetchImpl: createFetch(buildPages(150)) as unknown as typeof fetch, sleep: async () => {} });

		expect(order).toEqual(["batch", "checkpoint", "batch", "checkpoint"]);
	});

	it("페이지 사이에 count가 바뀌면 처음부터 다시 돌고, 안정되면 완료한다", async () => {
		const stable = buildPages(150);
		const drifting = [buildPageBody({ page: 1, count: 150, ids: Array.from({ length: 100 }, (_, i) => i + 1), next: NEXT(2) }), buildPageBody({ page: 2, count: 151, ids: Array.from({ length: 51 }, (_, i) => i + 101), next: null })];
		let call = 0;
		const fetchImpl = vi.fn(async (url: string) => {
			call += 1;
			const page = Number(new URL(url).searchParams.get("page"));
			const source = call <= 2 ? drifting : stable;

			return new Response(JSON.stringify(source[page - 1]), { status: 200 });
		});

		const evidence = await collectToss({ ingest: createIngest(), fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {}, log: () => {} });

		expect(evidence.uniqueCount).toBe(150);
	});

	it("끝내 어긋나면 count_mismatch로 실패한다", async () => {
		const broken = [buildPageBody({ page: 1, count: 120, ids: Array.from({ length: 100 }, (_, i) => i + 1), next: NEXT(2) }), buildPageBody({ page: 2, count: 120, ids: Array.from({ length: 10 }, (_, i) => i + 101), next: null })];

		await expect(collectToss({ ingest: createIngest(), fetchImpl: createFetch(broken) as unknown as typeof fetch, sleep: async () => {}, log: () => {} })).rejects.toMatchObject({ code: "count_mismatch" });
	});

	it("같은 글이 두 페이지에 나오면(순회 중 밀림) 완료로 치지 않는다", async () => {
		const dup = [buildPageBody({ page: 1, count: 101, ids: Array.from({ length: 100 }, (_, i) => i + 1), next: NEXT(2) }), buildPageBody({ page: 2, count: 101, ids: [100], next: null })];

		await expect(collectToss({ ingest: createIngest(), fetchImpl: createFetch(dup) as unknown as typeof fetch, sleep: async () => {}, log: () => {} })).rejects.toMatchObject({ code: "count_mismatch" });
	});

	it("시간 제한에 도달하면 time_limit과 재개 지점을 남긴다", async () => {
		const clock = vi.fn().mockReturnValueOnce(0).mockReturnValue(10_000);

		await expect(
			collectToss({ ingest: createIngest(), fetchImpl: createFetch(buildPages(250)) as unknown as typeof fetch, sleep: async () => {}, now: clock, deadline: 5_000 }),
		).rejects.toMatchObject({ code: "time_limit", checkpoint: { nextPage: 2 } });
	});

	it("next 사슬이 count보다 길게 이어지면 schema_changed", async () => {
		const endless = (page: number) => buildPageBody({ page, count: 100, ids: page === 1 ? Array.from({ length: 100 }, (_, i) => i + 1) : [], next: NEXT(page + 1) });
		const fetchImpl = vi.fn(async (url: string) => new Response(JSON.stringify(endless(Number(new URL(url).searchParams.get("page")))), { status: 200 }));

		await expect(collectToss({ ingest: createIngest(), fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {} })).rejects.toMatchObject({ code: "schema_changed" });
	});
});

describe("fetchTossPageJson", () => {
	const url = TOSS_FIRST_PAGE_URL;

	it("429는 백오프로 재시도한 뒤 성공한다", async () => {
		const sleeps: number[] = [];
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "1" } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

		await expect(fetchTossPageJson({ url, fetchImpl, sleep: async (ms: number) => void sleeps.push(ms) })).resolves.toEqual({ ok: 1 });
		expect(sleeps).toEqual([1000]);
	});

	it("5xx가 계속되면 http_error, 429가 계속되면 rate_limited", async () => {
		const fiveHundred = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
		const tooMany = vi.fn().mockResolvedValue(new Response("", { status: 429 }));

		await expect(fetchTossPageJson({ url, fetchImpl: fiveHundred, sleep: async () => {} })).rejects.toMatchObject({ code: "http_error" });
		await expect(fetchTossPageJson({ url, fetchImpl: tooMany, sleep: async () => {} })).rejects.toMatchObject({ code: "rate_limited" });
		expect(fiveHundred).toHaveBeenCalledTimes(4);
	});

	it("403/401은 재시도하지 않고 blocked로 기록한다", async () => {
		const forbidden = vi.fn().mockResolvedValue(new Response("", { status: 403 }));

		await expect(fetchTossPageJson({ url, fetchImpl: forbidden, sleep: async () => {} })).rejects.toMatchObject({ code: "blocked" });
		expect(forbidden).toHaveBeenCalledTimes(1);
	});

	it("그 밖의 4xx는 재시도 없이 http_error", async () => {
		const notFound = vi.fn().mockResolvedValue(new Response("", { status: 404 }));

		await expect(fetchTossPageJson({ url, fetchImpl: notFound, sleep: async () => {} })).rejects.toMatchObject({ code: "http_error" });
		expect(notFound).toHaveBeenCalledTimes(1);
	});

	it("네트워크 오류는 재시도하고 끝내 network로 던진다", async () => {
		const failing = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

		await expect(fetchTossPageJson({ url, fetchImpl: failing, sleep: async () => {} })).rejects.toMatchObject({ code: "network" });
		expect(failing).toHaveBeenCalledTimes(4);
	});
});
