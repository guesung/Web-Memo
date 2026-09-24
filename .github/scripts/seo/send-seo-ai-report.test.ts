// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
}));

import { postSeoAiReport, sendSeoAiReport } from "./send-seo-ai-report.mjs";

const context = {
	generatedAt: "2026-09-23T00:30:00.000Z",
	mode: "daily",
	reportDate: "2026-09-23",
	seo: { errors: 0, warnings: 1, issueGroups: [] },
	gsc: { status: "missing" },
	evidenceIds: ["seo:H1_COUNT_INVALID:h1"],
};

const result = JSON.stringify({
	status: "warning",
	headline: "h1이 빠진 지면이 있습니다.",
	situation: { good: [], concerns: ["h1 누락"] },
	findings: [
		{
			priority: "P2",
			title: "h1 누락",
			impact: "영향",
			evidence: "근거",
			suggestion: "제안",
			codeRefs: [],
			evidenceIds: ["seo:H1_COUNT_INVALID:h1"],
		},
	],
	roadmap: [],
});

const env = (overrides = {}) => ({
	AI_REPORT_RESULT: result,
	SLACK_BOT_TOKEN: "xoxb-test",
	SLACK_CHANNEL_ID: "C123",
	GITHUB_OUTPUT: "/tmp/output",
	...overrides,
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("postSeoAiReport", () => {
	it("본문 ts로 스레드 댓글을 달고, 댓글 실패는 발송 실패로 보지 않는다", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const post = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, ts: "1.1" })
			.mockResolvedValueOnce({ ok: false, error: "rate_limited" })
			.mockResolvedValueOnce({ ok: true, ts: "1.3" });

		const sent = await postSeoAiReport({
			rootPayload: { text: "root" },
			threadPayloads: [{ text: "a" }, { text: "b" }],
			token: "t",
			channel: "C",
			post,
		});

		expect(sent).toEqual({ sent: true, threadFailures: 1, error: null });
		expect(post.mock.calls[1][0].threadTs).toBe("1.1");
		expect(post.mock.calls[2][0].threadTs).toBe("1.1");
	});

	it("본문이 실패하면 댓글을 보내지 않고 미발송으로 본다", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const post = vi.fn().mockResolvedValue({ ok: false, error: "channel_not_found" });

		const sent = await postSeoAiReport({
			rootPayload: { text: "root" },
			threadPayloads: [{ text: "a" }],
			token: "t",
			channel: "C",
			post,
		});

		expect(sent).toEqual({ sent: false, threadFailures: 0, error: "channel_not_found" });
		expect(post).toHaveBeenCalledTimes(1);
	});
});

describe("sendSeoAiReport", () => {
	it("검증한 리포트를 보내고 보관 파일과 sent=true를 남긴다", async () => {
		readFile.mockResolvedValue(JSON.stringify(context));
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		const post = vi.fn().mockResolvedValue({ ok: true, ts: "1.1" });

		const sent = await sendSeoAiReport({ env: env(), post });

		expect(sent).toBe(true);
		expect(writeFile).toHaveBeenCalledWith("artifacts/seo/ai-report.md", expect.stringContaining("h1 누락"));
		const stored = JSON.parse(
			writeFile.mock.calls.find(([path]) => path === "artifacts/seo/ai-report.json")[1],
		);
		expect(stored).toMatchObject({ status: "warning", delivered: true, counts: { P2: 1 } });
		expect(appendFile).toHaveBeenCalledWith(
			"/tmp/output",
			"sent=true\nthread_failures=0\nfailure_reason=none\n",
		);
	});

	it("AI 결과가 없으면 sent=false로 기존 알림에 넘긴다", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		const sent = await sendSeoAiReport({ env: env({ AI_REPORT_RESULT: "" }) });

		expect(sent).toBe(false);
		expect(appendFile).toHaveBeenCalledWith(
			"/tmp/output",
			"sent=false\nthread_failures=0\nfailure_reason=missing_result\n",
		);
		expect(writeFile).not.toHaveBeenCalled();
	});

	it("AI 결과를 해석하지 못해도 던지지 않고 sent=false를 남긴다", async () => {
		readFile.mockResolvedValue(JSON.stringify(context));
		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		const sent = await sendSeoAiReport({ env: env({ AI_REPORT_RESULT: "{broken" }) });

		expect(sent).toBe(false);
		expect(appendFile).toHaveBeenCalledWith(
			"/tmp/output",
			"sent=false\nthread_failures=0\nfailure_reason=invalid_result\n",
		);
	});

	it("본문을 보낸 뒤 보관에 실패해도 sent=true를 남겨 대체 알림이 중복으로 나가지 않는다", async () => {
		readFile.mockResolvedValue(JSON.stringify(context));
		writeFile.mockImplementation(async (path) => {
			if (path === "artifacts/seo/ai-report.json") {
				throw new Error("disk full");
			}
		});
		const post = vi.fn().mockResolvedValue({ ok: true, ts: "1.1" });

		await expect(sendSeoAiReport({ env: env(), post })).rejects.toThrow("disk full");
		expect(appendFile).toHaveBeenCalledWith(
			"/tmp/output",
			"sent=true\nthread_failures=0\nfailure_reason=none\n",
		);
		writeFile.mockReset();
	});

	it("Slack 오류 문구에 개행이 섞여도 output 한 줄로 남긴다", async () => {
		readFile.mockResolvedValue(JSON.stringify(context));
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const post = vi.fn().mockResolvedValue({ ok: false, error: "request_failed: boom\nsent=true" });

		await sendSeoAiReport({ env: env(), post });

		expect(appendFile.mock.calls[0][1].split("\n").filter(Boolean)).toEqual([
			"sent=false",
			"thread_failures=0",
			"failure_reason=slack_request_failed_boom_sent_true",
		]);
	});

	it("Slack 값이 없으면 내용만 출력하고 보관은 하되 sent=false다", async () => {
		readFile.mockResolvedValue(JSON.stringify(context));
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		const post = vi.fn();

		const sent = await sendSeoAiReport({ env: env({ SLACK_BOT_TOKEN: "" }), post });

		expect(sent).toBe(false);
		expect(post).not.toHaveBeenCalled();
		expect(writeFile).toHaveBeenCalledWith("artifacts/seo/ai-report.json", expect.stringContaining('"delivered": false'));
	});
});
