import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
	new URL("./notify-build-ready.mjs", import.meta.url),
);

/**
 * 실제 Slack이나 스토어로 요청이 나가지 않도록 fetch를 가짜로 바꾸는 preload입니다.
 * 요청을 FETCH_LOG 파일에 한 줄씩 기록하고, FETCH_MODE=slack-error면 ok:false를 돌려줍니다.
 */
const PRELOAD_SOURCE = `
import { appendFileSync } from "node:fs";

globalThis.fetch = async (url, init) => {
	appendFileSync(
		process.env.FETCH_LOG,
		JSON.stringify({ url: String(url), body: JSON.parse(init?.body ?? "null") }) + "\\n",
	);

	if (process.env.FETCH_MODE === "slack-error") {
		return { ok: true, status: 200, json: async () => ({ ok: false, error: "not_in_channel" }) };
	}

	return { ok: true, status: 200, json: async () => ({ ok: true, ts: "9.9" }) };
};
`;

let workDir = "";
let preloadUrl = "";

beforeAll(() => {
	workDir = mkdtempSync(join(tmpdir(), "notify-build-ready-"));
	const preloadPath = join(workDir, "preload.mjs");

	writeFileSync(preloadPath, PRELOAD_SOURCE);
	preloadUrl = pathToFileURL(preloadPath).href;
});

afterAll(() => {
	// mkdtemp로 만든 임시 폴더는 OS가 정리합니다.
});

const allSkipped = JSON.stringify({
	ci: "success",
	app: "skipped",
	web: "skipped",
	extension: "skipped",
});

/** 시크릿·Slack 환경변수가 개발 기기에서 새어 들어오지 않도록 깨끗한 env로 실행합니다. */
const runScript = (env: Record<string, string>) => {
	const fetchLog = join(workDir, `fetch-${Math.random().toString(36).slice(2)}.log`);

	writeFileSync(fetchLog, "");

	const result = spawnSync("node", ["--import", preloadUrl, SCRIPT_PATH], {
		encoding: "utf8",
		env: {
			PATH: process.env.PATH ?? "",
			GITHUB_REPOSITORY: "guesung/Web-Memo",
			GITHUB_RUN_ID: "123",
			GITHUB_SHA: "b931ac6a7159b876f23e1dcfda08e238f1e02bc6",
			FETCH_LOG: fetchLog,
			...env,
		},
	});

	const requests = readFileSync(fetchLog, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as { url: string; body: Record<string, unknown> });

	return {
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
		requests,
	};
};

const threadEnv = {
	SLACK_BOT_TOKEN: "xoxb-test",
	SLACK_CHANNEL_ID: "C123",
	SLACK_THREAD_TS: "1.1",
};

describe("notify-build-ready.mjs: 배포 대상이 없는 머지", () => {
	it("스레드가 있고 변경이 없으면 그 스레드에 변경 없음 한 줄을 단다", () => {
		const result = runScript({ BUILD_RESULTS: allSkipped, ...threadEnv });

		expect(result.status).toBe(0);
		expect(result.requests).toHaveLength(1);
		expect(result.requests[0].url).toBe("https://slack.com/api/chat.postMessage");
		expect(result.requests[0].body).toMatchObject({
			channel: "C123",
			thread_ts: "1.1",
			text: "배포 대상 변경 없음",
		});
		expect(JSON.stringify(result.requests[0].body.blocks)).toContain(
			"배포 대상 변경 없음",
		);
	});

	it("변경 없음 댓글에는 배포 버튼이 없다", () => {
		const result = runScript({ BUILD_RESULTS: allSkipped, ...threadEnv });
		const blocks = result.requests[0].body.blocks as { type: string }[];

		expect(blocks.map((block) => block.type)).not.toContain("actions");
	});

	it("스레드가 없으면 예전처럼 아무것도 보내지 않고 조용히 끝난다", () => {
		const result = runScript({
			BUILD_RESULTS: allSkipped,
			...threadEnv,
			SLACK_THREAD_TS: "",
		});

		expect(result.status).toBe(0);
		expect(result.requests).toHaveLength(0);
		expect(result.stdout).toContain("건너뜁니다");
		expect(result.stderr).not.toContain("::warning::");
	});

	it("웹훅이 있어도 스레드가 없으면 최상위로 내려보내지 않는다", () => {
		const result = runScript({
			BUILD_RESULTS: allSkipped,
			SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/x",
		});

		expect(result.status).toBe(0);
		expect(result.requests).toHaveLength(0);
	});

	// ci가 취소됐는데 "변경 없음, CI 통과"라고 말하면 거짓이다
	it.each(["cancelled", "skipped"])(
		"ci가 %s이면 스레드가 있어도 변경 없음 댓글을 달지 않는다",
		(ci) => {
			const result = runScript({
				BUILD_RESULTS: JSON.stringify({
					ci,
					app: "skipped",
					web: "skipped",
					extension: "skipped",
				}),
				...threadEnv,
			});

			expect(result.status).toBe(0);
			expect(result.requests).toHaveLength(0);
		},
	);

	it("봇 토큰이나 채널이 없으면 경고만 남기고 exit 0이다", () => {
		const result = runScript({
			BUILD_RESULTS: allSkipped,
			SLACK_THREAD_TS: "1.1",
		});

		expect(result.status).toBe(0);
		expect(result.requests).toHaveLength(0);
		expect(result.stderr).toContain("::warning::");
	});

	it("Slack이 거절해도 Slack의 error를 경고에 남기고 exit 0이다", () => {
		const result = runScript({
			BUILD_RESULTS: allSkipped,
			...threadEnv,
			FETCH_MODE: "slack-error",
		});

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::");
		expect(result.stderr).toContain("not_in_channel");
	});
});
