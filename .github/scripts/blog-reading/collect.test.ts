import { describe, expect, it, vi } from "vitest";

import { IngestError } from "./ingestClient.mjs";
import { buildSummaryMarkdown, decideExitCode, EXIT_BLOCKED, EXIT_FAILED, EXIT_OK, parseArgs, resolveBlogIds, runBlog, toSourceError } from "./collect.mjs";
import { SourceError } from "./sourceError.mjs";

const LEASE_TOKEN = "3f2b1c9e-8a4d-4c1e-9b7a-0d5e6f7a8b9c";

const createClient = (overrides = {}) => ({
	claim: vi.fn(async () => ({ claimed: true, generation: 3, leaseToken: LEASE_TOKEN, resume: false })),
	batch: vi.fn(async () => ({})),
	checkpoint: vi.fn(async () => ({})),
	finish: vi.fn(async () => ({ total: 5 })),
	fail: vi.fn(async () => ({})),
	...overrides,
});

const args = { trigger: "daily", force: false };

describe("parseArgs", () => {
	it("기본값과 옵션", () => {
		expect(parseArgs([])).toMatchObject({ source: "all", trigger: "manual", force: false, dryRun: false, smoke: false, timeLimitMinutes: 40 });
		expect(parseArgs(["--source", "toss", "--trigger", "daily", "--force", "--dry-run", "--time-limit-minutes", "20"])).toMatchObject({
			source: "toss",
			trigger: "daily",
			force: true,
			dryRun: true,
			timeLimitMinutes: 20,
		});
	});

	it.each([
		[["--source", "velog"]],
		[["--trigger", "hourly"]],
		[["--source"]],
		[["--bogus"]],
		[["--time-limit-minutes", "0"]],
		[["--smoke"]],
		[["--smoke", "--source", "toss"]],
	])("잘못된 인자는 던진다: %j", (argv) => {
		expect(() => parseArgs(argv)).toThrow();
	});

	it("smoke는 당근과 함께만 허용한다", () => {
		expect(parseArgs(["--source", "daangn", "--smoke"]).smoke).toBe(true);
	});

	it("긱뉴스는 feed·manual 트리거로만 받는다", () => {
		expect(parseArgs(["--source", "geeknews", "--trigger", "feed"])).toMatchObject({ source: "geeknews", trigger: "feed" });
		expect(parseArgs(["--source", "geeknews", "--trigger", "manual"]).source).toBe("geeknews");
		expect(() => parseArgs(["--source", "geeknews", "--trigger", "daily"])).toThrow();
		expect(() => parseArgs(["--source", "geeknews", "--trigger", "request"])).toThrow();
	});

	it("feed 트리거는 아카이브 소스를 받지 않는다", () => {
		expect(() => parseArgs(["--source", "toss", "--trigger", "feed"])).toThrow();
		expect(() => parseArgs(["--source", "daangn", "--trigger", "feed"])).toThrow();
	});
});

describe("resolveBlogIds", () => {
	it("all은 feed면 긱뉴스만, 아니면 토스·당근만 돌린다", () => {
		expect(resolveBlogIds({ source: "all", trigger: "feed" })).toEqual(["geeknews"]);
		expect(resolveBlogIds({ source: "all", trigger: "daily" })).toEqual(["toss", "daangn"]);
		expect(resolveBlogIds({ source: "all", trigger: "request" })).toEqual(["toss", "daangn"]);
		expect(resolveBlogIds({ source: "all", trigger: "manual" })).toEqual(["toss", "daangn"]);
	});

	it("소스를 지정하면 그것만 돌린다", () => {
		expect(resolveBlogIds({ source: "geeknews", trigger: "manual" })).toEqual(["geeknews"]);
		expect(resolveBlogIds({ source: "toss", trigger: "daily" })).toEqual(["toss"]);
	});
});

describe("runBlog", () => {
	it("claim 거절이면 건너뛴다", async () => {
		const client = createClient({ claim: vi.fn(async () => ({ claimed: false, reason: "lease_active" })) });
		const result = await runBlog({ blogId: "toss", client, args, deadline: Infinity, log: () => {}, runners: { toss: vi.fn() } });

		expect(result).toEqual({ blogId: "toss", outcome: "skipped", reason: "lease_active" });
		expect(client.finish).not.toHaveBeenCalled();
	});

	it("수집이 끝나면 종료 증거로 finish한다", async () => {
		const client = createClient();
		const evidence = { kind: "toss", nextIsNull: true, reportedCount: 5, uniqueCount: 5, pageCount: 1 };
		const runners = {
			toss: vi.fn(async ({ ingest }) => {
				await ingest.batch([{ providerId: "1" }]);
				await ingest.checkpoint({ nextPage: 2 });

				return evidence;
			}),
		};

		const result = await runBlog({ blogId: "toss", client, args, deadline: Infinity, log: () => {}, runners });

		expect(result).toMatchObject({ outcome: "complete", uniqueCount: 5, total: 5 });
		expect(client.batch).toHaveBeenCalledWith({ blogId: "toss", generation: 3, leaseToken: LEASE_TOKEN, items: [{ providerId: "1" }] });
		expect(client.finish).toHaveBeenCalledWith({ blogId: "toss", generation: 3, leaseToken: LEASE_TOKEN, evidence });
		expect(client.fail).not.toHaveBeenCalled();
	});

	it("차단되면 fail(blocked)을 기록하고 complete로 표시하지 않는다", async () => {
		const client = createClient();
		const runners = { daangn: vi.fn(async () => { throw new SourceError("blocked", "HTTP 403"); }) };

		const result = await runBlog({ blogId: "daangn", client, args, deadline: Infinity, log: () => {}, runners });

		expect(result).toMatchObject({ outcome: "failed", errorCode: "blocked" });
		expect(client.finish).not.toHaveBeenCalled();
		expect(client.fail).toHaveBeenCalledWith(expect.objectContaining({ blogId: "daangn", errorCode: "blocked", keepCheckpoint: true }));
	});

	it("time_limit은 checkpoint를 함께 기록한다", async () => {
		const client = createClient();
		const runners = { toss: vi.fn(async () => { throw new SourceError("time_limit", "limit", { checkpoint: { nextPage: 3 } }); }) };

		await runBlog({ blogId: "toss", client, args, deadline: Infinity, log: () => {}, runners });

		expect(client.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "time_limit", checkpoint: { nextPage: 3 }, keepCheckpoint: true }));
	});

	it("서버가 개수 불일치로 finish를 거절하면 count_mismatch로 기록한다", async () => {
		const client = createClient({
			finish: vi.fn(async () => { throw new IngestError({ status: 422, code: "rejected", message: "count_mismatch" }); }),
		});
		const runners = { toss: vi.fn(async () => ({ kind: "toss", nextIsNull: true, reportedCount: 5, uniqueCount: 5, pageCount: 1 })) };

		const result = await runBlog({ blogId: "toss", client, args, deadline: Infinity, log: () => {}, runners });

		expect(result).toMatchObject({ outcome: "failed", errorCode: "count_mismatch" });
		expect(client.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "count_mismatch", keepCheckpoint: false }));
	});

	it("stale lease면 fail을 부르지 않고 stale로 보고한다", async () => {
		const client = createClient();
		const runners = { toss: vi.fn(async ({ ingest }) => { await ingest.batch([]); return {}; }) };

		client.batch.mockRejectedValue(new IngestError({ status: 409, code: "stale_lease", message: "stale_lease" }));

		const result = await runBlog({ blogId: "toss", client, args, deadline: Infinity, log: () => {}, runners });

		expect(result.outcome).toBe("stale");
		expect(client.fail).not.toHaveBeenCalled();
	});

	it("fail 기록이 실패해도 예외를 던지지 않고 실패 결과를 돌려준다", async () => {
		const client = createClient({ fail: vi.fn(async () => { throw new Error("down"); }) });
		const runners = { toss: vi.fn(async () => { throw new SourceError("network", "x"); }) };

		await expect(runBlog({ blogId: "toss", client, args, deadline: Infinity, log: () => {}, runners })).resolves.toMatchObject({ outcome: "failed", errorCode: "network" });
	});
});

describe("toSourceError / decideExitCode / summary", () => {
	it("오류를 분류한다", () => {
		expect(toSourceError(new IngestError({ status: 0, code: "network", message: "x" })).code).toBe("network");
		expect(toSourceError(new IngestError({ status: 400, code: "invalid_request", message: "x" })).code).toBe("schema_changed");
		expect(toSourceError(new IngestError({ status: 500, code: "internal_error", message: "x" })).code).toBe("internal");
		expect(toSourceError(new Error("boom")).code).toBe("internal");
	});

	it("종료 코드: 정상 0, 차단만 3, 그 밖의 실패 1", () => {
		expect(decideExitCode([{ outcome: "complete" }, { outcome: "skipped" }])).toBe(EXIT_OK);
		expect(decideExitCode([{ outcome: "complete" }, { outcome: "failed", errorCode: "blocked" }])).toBe(EXIT_BLOCKED);
		expect(decideExitCode([{ outcome: "failed", errorCode: "blocked" }, { outcome: "failed", errorCode: "network" }])).toBe(EXIT_FAILED);
		expect(decideExitCode([{ outcome: "stale", errorCode: "stale_lease" }])).toBe(EXIT_FAILED);
	});

	it("요약은 사유 코드를 밝히고 기존 글 유지·미완료 표시를 명시한다", () => {
		const markdown = buildSummaryMarkdown({
			args: { trigger: "daily", dryRun: false },
			results: [
				{ blogId: "toss", outcome: "complete", uniqueCount: 5, total: 5 },
				{ blogId: "daangn", outcome: "failed", errorCode: "blocked", message: "HTTP 403" },
			],
		});

		expect(markdown).toContain("`blocked`");
		expect(markdown).toContain("완료로 표시되지 않았습니다");
	});
});

describe("runBlog (긱뉴스 feed)", () => {
	it("feed 트리거로 claim하고 피드 증거로 finish한다", async () => {
		const client = createClient({ finish: vi.fn(async () => ({ total: null })) });
		const evidence = { kind: "geeknews", entryCount: 50, uniqueCount: 50 };
		const runners = { geeknews: vi.fn(async () => evidence) };
		const result = await runBlog({ blogId: "geeknews", client, args: { trigger: "feed", force: false }, deadline: Infinity, log: () => {}, runners });

		expect(client.claim).toHaveBeenCalledWith({ blogId: "geeknews", trigger: "feed", force: false });
		expect(client.finish).toHaveBeenCalledWith(expect.objectContaining({ blogId: "geeknews", evidence }));
		expect(result).toEqual({ blogId: "geeknews", outcome: "complete", uniqueCount: 50, total: null });
	});

	it("피드가 막히면 blocked로 기록하고 기존 글은 건드리지 않는다", async () => {
		const client = createClient();
		const runners = { geeknews: vi.fn(async () => Promise.reject(new SourceError("blocked", "403"))) };
		const result = await runBlog({ blogId: "geeknews", client, args: { trigger: "feed", force: false }, deadline: Infinity, log: () => {}, runners });

		expect(client.finish).not.toHaveBeenCalled();
		expect(client.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "blocked" }));
		expect(result).toMatchObject({ outcome: "failed", errorCode: "blocked" });
	});
});
