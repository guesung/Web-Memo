import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
	new URL("./notify-thread-reply.mjs", import.meta.url),
);

/** 시크릿·Slack 환경변수가 개발 기기에서 새어 들어오지 않도록 깨끗한 env로 실행합니다. */
const runScript = (env: Record<string, string>, mockSlack = false) => {
	const nodeArgs = [SCRIPT_PATH];

	if (mockSlack) {
		const preload = `globalThis.fetch = async (url, options) => {
			console.log(JSON.stringify({ url, body: JSON.parse(options.body) }));
			if (process.env.MOCK_NETWORK_ERROR === "true") { throw new Error("network unavailable"); }
			return { ok: true, json: async () => process.env.MOCK_SLACK_ERROR ?
				{ ok: false, error: process.env.MOCK_SLACK_ERROR } : { ok: true, ts: "2.2" } };
		};`;
		nodeArgs.unshift(
			"--import",
			`data:text/javascript,${encodeURIComponent(preload)}`,
		);
	}

	const result = spawnSync("node", nodeArgs, {
		encoding: "utf8",
		env: {
			PATH: process.env.PATH ?? "",
			GITHUB_REPOSITORY: "guesung/Web-Memo",
			GITHUB_RUN_ID: "123",
			...env,
		},
	});

	return {
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
	};
};

describe("develop 앱 App Tester 배포 댓글", () => {
	const submitEnv = {
		TARGET: "app",
		REPLY_PHASE: "store-submit",
		CHANGED: "true",
		RESULT: "success",
		SLACK_THREAD_TS: "1.1",
		SLACK_BOT_TOKEN: "test-token",
		SLACK_CHANNEL_ID: "C1",
		SLACK_WEBHOOK_URL: "https://example.invalid/webhook",
		GITHUB_SHA: "test-sha",
	};

	it.each([
		["success", "앱 App Tester 배포 완료"],
		["failure", "앱 빌드·App Tester 배포 실패"],
	])(
		"%s 결과를 같은 스레드에 로그 링크만 붙여 전송한다",
		(outcome, message) => {
			const result = runScript({ ...submitEnv, RESULT: outcome }, true);
			const request = JSON.parse(result.stdout);

			expect(result.status).toBe(0);
			expect(request.url).toBe("https://slack.com/api/chat.postMessage");
			expect(request.body).toMatchObject({
				thread_ts: "1.1",
				channel: "C1",
				text: message,
			});
			expect(request.body.blocks[1].type).toBe("context");
			expect(result.stdout).toContain(
				"https://github.com/guesung/Web-Memo/actions/runs/123",
			);
			expect(result.stdout).not.toContain("deploy_");
			expect(result.stderr).toBe("");
		},
	);

	it.each(["SLACK_THREAD_TS", "SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID"])(
		"%s가 없으면 웹훅으로 대체하지 않는다",
		(missingKey) => {
			const result = runScript({ ...submitEnv, [missingKey]: "" }, true);

			expect(result.status).toBe(0);
			expect(result.stderr).toContain("::warning::");
			expect(result.stdout).not.toContain('"url"');
		},
	);

	it.each([
		{ CHANGED: "false", RESULT: "success" },
		{ CHANGED: "true", RESULT: "skipped" },
		{ CHANGED: "true", RESULT: "cancelled" },
	])("댓글 대상이 아니면 전송하지 않는다: %j", (outcome) => {
		const result = runScript({ ...submitEnv, ...outcome }, true);

		expect(result.status).toBe(0);
		expect(result.stdout).not.toContain('"url"');
		expect(result.stderr).toBe("");
	});

	it.each([
		{ MOCK_SLACK_ERROR: "invalid_auth" },
		{ MOCK_NETWORK_ERROR: "true" },
	])("Slack 전송 실패도 exit 0이며 웹훅 재전송이 없다: %j", (mockError) => {
		const result = runScript({ ...submitEnv, ...mockError }, true);

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::");
		expect(result.stdout.trim().split("\n")).toHaveLength(1);
		expect(JSON.parse(result.stdout).url).toBe(
			"https://slack.com/api/chat.postMessage",
		);
	});

	it("앱 이외의 대상에는 제출 댓글을 보내지 않는다", () => {
		const result = runScript({ ...submitEnv, TARGET: "web" }, true);

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("알 수 없는 댓글 단계");
		expect(result.stdout).toBe("");
	});
});
