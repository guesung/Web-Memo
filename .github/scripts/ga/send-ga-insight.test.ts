// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendGaInsight } from "./send-ga-insight.mjs";

const CONTEXT = {
	kind: "daily",
	targetDate: "2026-11-15",
	slack: { channel: "C0C19MXDLKD", ts: "1794792439.053239" },
	runUrl: "https://github.com/guesung/Web-Memo/actions/runs/1",
};

const RESULT = JSON.stringify({
	summary: "평소 수준입니다.",
	insights: [
		{ title: "건수 급증은 한 기기로 추정", detail: "근거", action: "지켜봅니다" },
	],
	caveats: [],
});

const readContext = async () => JSON.stringify(CONTEXT);

let warnSpy;
let logSpy;
let directory;

const warnings = () => warnSpy.mock.calls.map((call) => String(call[0])).join("\n");

beforeEach(() => {
	warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
	warnSpy.mockRestore();
	logSpy.mockRestore();

	if (directory) {
		await rm(directory, { recursive: true, force: true });
		directory = undefined;
	}
});

describe("sendGaInsight", () => {
	it("리포트 메시지의 ts 를 thread_ts 로 삼아 같은 채널에 댓글을 단다", async () => {
		const post = vi.fn(async () => ({ ok: true, ts: "2.2" }));

		const result = await sendGaInsight({
			env: {
				AI_INSIGHT_RESULT: RESULT,
				GA_INSIGHT_CONTEXT_PATH: "context.json",
				SLACK_BOT_TOKEN: "xoxb-t",
			},
			post,
			readContext,
		});

		expect(result).toEqual({ sent: true, failureReason: "none" });
		expect(post).toHaveBeenCalledTimes(1);

		const call = post.mock.calls[0][0];

		expect(call.token).toBe("xoxb-t");
		expect(call.channel).toBe("C0C19MXDLKD");
		expect(call.threadTs).toBe("1794792439.053239");
		expect(call.payload.blocks.at(-1).elements[0].text).toBe(
			`AI 생성 · <${CONTEXT.runUrl}|워크플로 런>`,
		);
	});

	it("Claude 단계가 결과를 못 냈으면 경고만 남기고 보내지 않는다", async () => {
		const post = vi.fn();

		const result = await sendGaInsight({
			env: { AI_INSIGHT_RESULT: "", SLACK_BOT_TOKEN: "xoxb-t" },
			post,
			readContext,
		});

		expect(result).toEqual({ sent: false, failureReason: "missing_result" });
		expect(post).not.toHaveBeenCalled();
		expect(warnings()).toContain("::warning::");
	});

	it("결과를 해석할 수 없으면 던지지 않고 건너뛴다", async () => {
		const post = vi.fn();

		const result = await sendGaInsight({
			env: { AI_INSIGHT_RESULT: "not json", SLACK_BOT_TOKEN: "xoxb-t" },
			post,
			readContext,
		});

		expect(result).toEqual({ sent: false, failureReason: "invalid_result" });
		expect(post).not.toHaveBeenCalled();
	});

	it("입력 파일을 읽지 못해도 던지지 않는다", async () => {
		const result = await sendGaInsight({
			env: { AI_INSIGHT_RESULT: RESULT, SLACK_BOT_TOKEN: "xoxb-t" },
			post: vi.fn(),
			readContext: async () => {
				throw new Error("ENOENT");
			},
		});

		expect(result).toEqual({ sent: false, failureReason: "invalid_result" });
	});

	it("봇 토큰이 없으면 보낼 내용만 출력한다", async () => {
		const post = vi.fn();

		const result = await sendGaInsight({
			env: { AI_INSIGHT_RESULT: RESULT },
			post,
			readContext,
		});

		expect(result).toEqual({
			sent: false,
			failureReason: "missing_slack_config",
		});
		expect(post).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledTimes(1);
	});

	it("댓글 전송이 실패하면 Slack 오류를 이유로 남기고 정상 종료한다", async () => {
		const result = await sendGaInsight({
			env: { AI_INSIGHT_RESULT: RESULT, SLACK_BOT_TOKEN: "xoxb-t" },
			post: async () => ({ ok: false, error: "thread_not_found" }),
			readContext,
		});

		expect(result).toEqual({
			sent: false,
			failureReason: "slack_thread_not_found",
		});
		expect(warnings()).toContain("thread_not_found");
	});

	it("전송 함수가 던져도 잡을 실패시키지 않는다", async () => {
		const result = await sendGaInsight({
			env: { AI_INSIGHT_RESULT: RESULT, SLACK_BOT_TOKEN: "xoxb-t" },
			post: async () => {
				throw new Error("boom");
			},
			readContext,
		});

		expect(result).toEqual({ sent: false, failureReason: "unexpected_error" });
	});

	it("결과를 step output 에 남긴다", async () => {
		directory = await mkdtemp(join(tmpdir(), "ga-insight-send-"));
		const outputPath = join(directory, "output");

		await sendGaInsight({
			env: {
				AI_INSIGHT_RESULT: RESULT,
				SLACK_BOT_TOKEN: "xoxb-t",
				GITHUB_OUTPUT: outputPath,
			},
			post: async () => ({ ok: false, error: "not_in_channel" }),
			readContext,
		});

		expect(await readFile(outputPath, "utf8")).toBe(
			"sent=false\nfailure_reason=slack_not_in_channel\n",
		);
	});
});
