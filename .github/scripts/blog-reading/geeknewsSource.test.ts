import { describe, expect, it, vi } from "vitest";

import { collectGeeknews, fetchGeeknewsFeed, GEEKNEWS_FEED_URL, parseGeeknewsFeed, parseTopicId } from "./geeknewsSource.mjs";
import { SourceError } from "./sourceError.mjs";

const FEED_OPEN = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>GeekNews - 개발/기술/스타트업 뉴스 서비스</title>
<link href="https://news.hada.io/rss/news" rel="self"/>
<link href="https://news.hada.io"/>
<id>https://news.hada.io/rss/news</id>
<updated>2026-10-25T10:00:00+09:00</updated>
`;

const buildEntry = ({ id, title, published = "2026-10-25T09:00:00+09:00", updated = "2026-10-25T09:30:00+09:00" }: { id: number; title: string; published?: string; updated?: string }) => `<entry>
  <title>${title}</title>
  <link href="https://news.hada.io/topic?id=${id}" rel="alternate"/>
  <updated>${updated}</updated>
  <published>${published}</published>
  <id>https://news.hada.io/topic?id=${id}</id>
  <author><name>someone</name></author>
  <content type="html"><![CDATA[<p>본문은 저장하지 않는다 <a href="https://example.com/topic?id=999">원문</a></p>]]></content>
</entry>
`;

const buildFeed = (entries: string[]) => `${FEED_OPEN}${entries.join("")}</feed>`;

const createIngest = () => ({ batch: vi.fn(async () => ({})), checkpoint: vi.fn(async () => ({})) });
const okFetch = (body: string) => vi.fn(async () => new Response(body, { status: 200 }));

describe("parseTopicId", () => {
	it.each([
		["https://news.hada.io/topic?id=12345", "12345"],
		[" https://news.hada.io/topic?id=1 ", "1"],
	])("허용: %s", (value, expected) => {
		expect(parseTopicId(value)).toBe(expected);
	});

	it.each([["https://news.hada.io/topic?id=abc"], ["http://news.hada.io/topic?id=1"], ["https://news.hada.io/topic?id=1&x=2"], ["https://example.com/topic?id=1"], [null], [42]])("거절: %s", (value) => {
		expect(parseTopicId(value as string)).toBeNull();
	});
});

describe("parseGeeknewsFeed", () => {
	it("엔트리에서 topic URL·제목·게시일만 뽑고 본문은 버린다", () => {
		const { articles, entryCount } = parseGeeknewsFeed(buildFeed([buildEntry({ id: 101, title: "첫 글" }), buildEntry({ id: 100, title: "둘째 글" })]));

		expect(entryCount).toBe(2);
		expect(articles[0]).toEqual({
			providerId: "101",
			title: "첫 글",
			url: "https://news.hada.io/topic?id=101",
			publishedAt: "2026-10-25T00:00:00.000Z",
			updatedAt: "2026-10-25T00:30:00.000Z",
			aliasUrls: [],
		});
		expect(JSON.stringify(articles)).not.toContain("본문");
		expect(JSON.stringify(articles)).not.toContain("example.com");
	});

	it("엔티티와 CDATA 제목을 풀고 공백을 정리한다", () => {
		const { articles } = parseGeeknewsFeed(buildFeed([buildEntry({ id: 1, title: "A &amp; B &lt;C&gt; &#39;D&#39; &#x41;" }), buildEntry({ id: 2, title: "<![CDATA[ 둘 &amp; 셋 ]]>" })]));

		expect(articles.map((article: { title: string }) => article.title)).toEqual(["A & B <C> 'D' A", "둘 &amp; 셋"]);
	});

	it("같은 글이 두 번 나오면 처음 것만 남기고 entryCount는 전체 엔트리 수다", () => {
		const { articles, entryCount } = parseGeeknewsFeed(buildFeed([buildEntry({ id: 5, title: "처음" }), buildEntry({ id: 5, title: "중복" })]));

		expect(entryCount).toBe(2);
		expect(articles).toHaveLength(1);
		expect(articles[0].title).toBe("처음");
	});

	it("published가 없으면 updated를 게시일로 쓴다", () => {
		const entry = `<entry><title>t</title><link href="https://news.hada.io/topic?id=7"/><updated>2026-10-01T00:00:00Z</updated></entry>`;
		const { articles } = parseGeeknewsFeed(buildFeed([entry]));

		expect(articles[0]).toMatchObject({ publishedAt: "2026-10-01T00:00:00.000Z", updatedAt: null });
	});

	it("link가 없어도 id가 topic 주소면 읽는다", () => {
		const entry = `<entry><title>t</title><id>https://news.hada.io/topic?id=8</id></entry>`;

		expect(parseGeeknewsFeed(buildFeed([entry])).articles[0].providerId).toBe("8");
	});

	it("topic 주소를 못 읽는 엔트리는 건너뛰되 나머지는 유지한다", () => {
		const broken = `<entry><title>외부</title><link href="https://example.com/x"/></entry>`;
		const { articles, entryCount } = parseGeeknewsFeed(buildFeed([broken, buildEntry({ id: 9, title: "정상" })]));

		expect(entryCount).toBe(2);
		expect(articles.map((article: { providerId: string }) => article.providerId)).toEqual(["9"]);
	});

	it.each([
		["루트가 Atom feed가 아님(RSS)", `<?xml version="1.0"?><rss version="2.0"><channel><item><title>x</title></item></channel></rss>`],
		["Atom 네임스페이스 없음", `<feed><entry><title>t</title><link href="https://news.hada.io/topic?id=1"/></entry></feed>`],
		["HTML 응답", `<!DOCTYPE html><html><body>점검 중</body></html>`],
		["엔트리 없음", `${FEED_OPEN}</feed>`],
		["엔트리는 있는데 topic?id=N 없음", buildFeed([`<entry><title>t</title><link href="https://news.hada.io/item/1"/></entry>`])],
		["빈 응답", ""],
	])("schema_changed: %s", (_label, xml) => {
		expect(() => parseGeeknewsFeed(xml)).toThrow(SourceError);

		try {
			parseGeeknewsFeed(xml);
		} catch (error) {
			expect((error as SourceError).code).toBe("schema_changed");
		}
	});
});

describe("fetchGeeknewsFeed", () => {
	it("고정된 피드 URL을 요청한다", async () => {
		const fetchImpl = okFetch("<feed/>");

		await fetchGeeknewsFeed({ fetchImpl });
		expect(fetchImpl).toHaveBeenCalledWith(GEEKNEWS_FEED_URL, expect.any(Object));
	});

	it("403은 재시도 없이 blocked다", async () => {
		const fetchImpl = vi.fn(async () => new Response("no", { status: 403 }));

		await expect(fetchGeeknewsFeed({ fetchImpl, sleep: async () => {} })).rejects.toMatchObject({ code: "blocked" });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("5xx는 제한 재시도 뒤 http_error, 429는 rate_limited다", async () => {
		const serverError = vi.fn(async () => new Response("x", { status: 503 }));
		const rateLimited = vi.fn(async () => new Response("x", { status: 429 }));

		await expect(fetchGeeknewsFeed({ fetchImpl: serverError, sleep: async () => {} })).rejects.toMatchObject({ code: "http_error" });
		expect(serverError).toHaveBeenCalledTimes(4);
		await expect(fetchGeeknewsFeed({ fetchImpl: rateLimited, sleep: async () => {} })).rejects.toMatchObject({ code: "rate_limited" });
	});

	it("5xx 뒤 성공하면 본문을 돌려준다", async () => {
		const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("x", { status: 502 })).mockResolvedValueOnce(new Response("ok", { status: 200 }));

		await expect(fetchGeeknewsFeed({ fetchImpl, sleep: async () => {} })).resolves.toBe("ok");
	});

	it("네트워크 오류는 network로 분류한다", async () => {
		const fetchImpl = vi.fn(async () => {
			throw new TypeError("fetch failed");
		});

		await expect(fetchGeeknewsFeed({ fetchImpl, sleep: async () => {} })).rejects.toMatchObject({ code: "network" });
	});

	it("404 같은 그 밖의 4xx는 재시도 없이 http_error다", async () => {
		const fetchImpl = vi.fn(async () => new Response("x", { status: 404 }));

		await expect(fetchGeeknewsFeed({ fetchImpl, sleep: async () => {} })).rejects.toMatchObject({ code: "http_error" });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});
});

describe("collectGeeknews", () => {
	it("피드를 batch로 보내고 엔트리·고유 수 증거를 돌려준다", async () => {
		const ingest = createIngest();
		const entries = Array.from({ length: 50 }, (_, index) => buildEntry({ id: index + 1, title: `글 ${index + 1}` }));
		const evidence = await collectGeeknews({ ingest, fetchImpl: okFetch(buildFeed(entries)) });

		expect(evidence).toEqual({ kind: "geeknews", entryCount: 50, uniqueCount: 50 });
		expect(ingest.batch).toHaveBeenCalledTimes(1);
		expect(ingest.batch.mock.calls[0][0]).toHaveLength(50);
		expect(ingest.checkpoint).not.toHaveBeenCalled();
	});

	it("형식이 바뀌면 아무것도 저장하지 않고 schema_changed로 던진다", async () => {
		const ingest = createIngest();

		await expect(collectGeeknews({ ingest, fetchImpl: okFetch("<rss></rss>") })).rejects.toMatchObject({ code: "schema_changed" });
		expect(ingest.batch).not.toHaveBeenCalled();
	});

	it("마감이 지났으면 요청 없이 time_limit이다", async () => {
		const fetchImpl = okFetch(buildFeed([buildEntry({ id: 1, title: "x" })]));

		await expect(collectGeeknews({ ingest: createIngest(), fetchImpl, now: () => 10, deadline: 5 })).rejects.toMatchObject({ code: "time_limit" });
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
