import { describe, expect, it } from "vitest";

import { isSecretMatch } from "./secret";
import { MAX_BATCH_ITEMS, parseIngestRequest } from "./validate";

const LEASE_TOKEN = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

const tossItem = (id: number) => ({
	providerId: String(id),
	title: `글 ${id}`,
	url: `https://toss.tech/article/post-${id}`,
	publishedAt: "2021-04-28T08:00:00+09:00",
	updatedAt: null,
});

describe("parseIngestRequest", () => {
	it("claim은 기본 lease 1200초, force false", () => {
		const result = parseIngestRequest({ action: "claim", blogId: "toss", trigger: "daily" });

		expect(result).toEqual({
			ok: true,
			value: { action: "claim", blogId: "toss", trigger: "daily", force: false, leaseSeconds: 1200 },
		});
	});

	it.each([
		[{ action: "claim", blogId: "velog", trigger: "daily" }],
		[{ action: "claim", blogId: "toss", trigger: "hourly" }],
		[{ action: "claim", blogId: "toss", trigger: "daily", leaseSeconds: 5 }],
		[{ action: "claim", blogId: "toss", trigger: "daily", force: "yes" }],
		[{ action: "nope", blogId: "toss" }],
		["not an object"],
		[null],
		[[]],
	])("잘못된 claim/본문은 거절: %j", (body) => {
		expect(parseIngestRequest(body).ok).toBe(false);
	});

	it("batch는 최대 100개까지 받고 101개는 거절한다", () => {
		const build = (count: number) => ({
			action: "batch",
			blogId: "toss",
			generation: 1,
			leaseToken: LEASE_TOKEN,
			items: Array.from({ length: count }, (_, index) => tossItem(index + 1)),
		});

		expect(parseIngestRequest(build(MAX_BATCH_ITEMS)).ok).toBe(true);
		expect(parseIngestRequest(build(MAX_BATCH_ITEMS + 1)).ok).toBe(false);
		expect(parseIngestRequest(build(0)).ok).toBe(false);
	});

	it("batch는 본문 같은 알 수 없는 키를 버린다", () => {
		const result = parseIngestRequest({
			action: "batch",
			blogId: "toss",
			generation: 1,
			leaseToken: LEASE_TOKEN,
			items: [{ ...tossItem(1), fullDescription: "<p>본문</p>", body: "x" }],
		});

		expect(result.ok).toBe(true);

		if (result.ok && result.value.action === "batch") {
			expect(Object.keys(result.value.items[0]).sort()).toEqual(
				["aliasUrls", "providerId", "publishedAt", "title", "updatedAt", "url"].sort(),
			);
		}
	});

	it.each([
		["다른 호스트", { ...tossItem(1), url: "https://evil.example/article/x" }],
		["http", { ...tossItem(1), url: "http://toss.tech/article/x" }],
		["토스가 아닌 경로", { ...tossItem(1), url: "https://toss.tech/other/x" }],
		["빈 제목", { ...tossItem(1), title: "   " }],
		["잘못된 providerId", { ...tossItem(1), providerId: "a b" }],
		["시각 형식", { ...tossItem(1), publishedAt: "2021-04-28" }],
		["존재하지 않는 시각", { ...tossItem(1), publishedAt: "2021-13-45T00:00:00Z" }],
		["별칭 초과", { ...tossItem(1), aliasUrls: Array.from({ length: 6 }, (_, i) => `https://toss.tech/article/a${i}`) }],
		["허용되지 않은 별칭", { ...tossItem(1), aliasUrls: ["https://evil.example/a"] }],
	])("batch 항목 거절: %s", (_name, item) => {
		const result = parseIngestRequest({
			action: "batch",
			blogId: "toss",
			generation: 1,
			leaseToken: LEASE_TOKEN,
			items: [item],
		});

		expect(result.ok).toBe(false);
	});

	it("당근 글은 medium.com/daangn/ 아래만, 별칭은 medium.com 아래를 허용한다", () => {
		const base = { providerId: "3fa344b4391b", title: "당근 글", publishedAt: null, updatedAt: null };
		const build = (item: Record<string, unknown>) =>
			parseIngestRequest({ action: "batch", blogId: "daangn", generation: 2, leaseToken: LEASE_TOKEN, items: [item] });

		expect(build({ ...base, url: "https://medium.com/daangn/slug-3fa344b4391b", aliasUrls: ["https://medium.com/p/3fa344b4391b"] }).ok).toBe(true);
		expect(build({ ...base, url: "https://medium.com/other/slug-3fa344b4391b" }).ok).toBe(false);
	});

	it.each([
		[{ generation: 0 }],
		[{ generation: 1.5 }],
		[{ generation: "1" }],
		[{ leaseToken: "nope" }],
	])("stale 판정 이전에 형식이 틀린 세대/토큰은 거절: %j", (override) => {
		const result = parseIngestRequest({
			action: "checkpoint",
			blogId: "toss",
			generation: 1,
			leaseToken: LEASE_TOKEN,
			checkpoint: { nextPage: 2 },
			...override,
		});

		expect(result.ok).toBe(false);
	});

	it("checkpoint는 객체이고 8KB를 넘지 않아야 한다", () => {
		const build = (checkpoint: unknown) =>
			parseIngestRequest({ action: "checkpoint", blogId: "toss", generation: 1, leaseToken: LEASE_TOKEN, checkpoint });

		expect(build({ nextPage: 2 }).ok).toBe(true);
		expect(build([1]).ok).toBe(false);
		expect(build({ blob: "x".repeat(9000) }).ok).toBe(false);
	});

	it("토스 finish는 next=null 증거와 개수를 요구한다", () => {
		const build = (evidence: unknown) =>
			parseIngestRequest({ action: "finish", blogId: "toss", generation: 1, leaseToken: LEASE_TOKEN, evidence });
		const valid = { kind: "toss", nextIsNull: true, reportedCount: 393, uniqueCount: 393, pageCount: 4 };

		expect(build(valid).ok).toBe(true);
		expect(build({ ...valid, nextIsNull: false }).ok).toBe(false);
		expect(build({ ...valid, reportedCount: 0 }).ok).toBe(false);
		expect(build({ ...valid, kind: "daangn" }).ok).toBe(false);
		expect(build(undefined).ok).toBe(false);
	});

	it("당근 finish는 hasNextPage=false와 빈 endCursor를 요구한다", () => {
		const build = (evidence: unknown) =>
			parseIngestRequest({ action: "finish", blogId: "daangn", generation: 1, leaseToken: LEASE_TOKEN, evidence });
		const valid = { kind: "daangn", hasNextPage: false, endCursor: "", uniqueCount: 220 };

		expect(build(valid).ok).toBe(true);
		expect(build({ ...valid, hasNextPage: true }).ok).toBe(false);
		expect(build({ ...valid, endCursor: "{\"post_id\":1}" }).ok).toBe(false);
		expect(build({ ...valid, uniqueCount: 0 }).ok).toBe(false);
		expect(build({ ...valid, kind: "toss" }).ok).toBe(false);
	});

	it("fail은 허용된 사유 코드만 받고 checkpoint를 유지하는 것이 기본이다", () => {
		const build = (extra: Record<string, unknown>) =>
			parseIngestRequest({ action: "fail", blogId: "daangn", generation: 1, leaseToken: LEASE_TOKEN, ...extra });

		const blocked = build({ errorCode: "blocked" });

		expect(blocked.ok).toBe(true);

		if (blocked.ok && blocked.value.action === "fail") {
			expect(blocked.value.keepCheckpoint).toBe(true);
			expect(blocked.value.checkpoint).toBeNull();
		}

		expect(build({ errorCode: "time_limit", checkpoint: { cursor: "x" }, keepCheckpoint: false }).ok).toBe(true);
		expect(build({ errorCode: "whatever" }).ok).toBe(false);
		expect(build({ errorCode: "blocked", keepCheckpoint: "no" }).ok).toBe(false);
	});
});

describe("isSecretMatch", () => {
	const secret = "s".repeat(40);

	it("같은 값만 통과한다", async () => {
		expect(await isSecretMatch(secret, secret)).toBe(true);
		expect(await isSecretMatch(`${secret}x`, secret)).toBe(false);
		expect(await isSecretMatch(secret.slice(1), secret)).toBe(false);
		expect(await isSecretMatch("", secret)).toBe(false);
		expect(await isSecretMatch(null, secret)).toBe(false);
	});
});
