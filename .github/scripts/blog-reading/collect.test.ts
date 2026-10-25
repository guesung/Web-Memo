import { describe, expect, it, vi } from "vitest";

import { IngestError } from "./ingestClient.mjs";
import { buildSummaryMarkdown, decideExitCode, EXIT_BLOCKED, EXIT_FAILED, EXIT_OK, parseArgs, runBlog, toSourceError } from "./collect.mjs";
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
