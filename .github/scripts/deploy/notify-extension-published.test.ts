import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import { readExtensionVersion } from "../shared/repo-versions.mjs";

const SCRIPT_PATH = fileURLToPath(
	new URL("./notify-extension-published.mjs", import.meta.url),
);

/**
 * 웹스토어와 Slack으로 요청이 나가지 않도록 fetch를 가짜로 바꾸는 preload입니다.
 * CRX 매니페스트에는 PUBLISHED_VERSION을 담아 돌려주고, 요청은 FETCH_LOG에 한 줄씩 남깁니다.
 * FETCH_MODE=store-error면 매니페스트 조회가 던지고, slack-error면 Slack이 500을 돌려줍니다.
 */
const PRELOAD_SOURCE = `
import { appendFileSync } from "node:fs";

globalThis.fetch = async (url, init) => {
	appendFileSync(
		process.env.FETCH_LOG,
		JSON.stringify({ url: String(url), body: JSON.parse(init?.body ?? "null") }) + "\\n",
	);

	if (String(url).startsWith("https://clients2.google.com/")) {
		if (process.env.FETCH_MODE === "store-error") {
			throw new Error("getaddrinfo ENOTFOUND");
		}

		return {
			ok: true,
			status: 200,
			text: async () =>
				'<?xml version="1.0"?><gupdate><app><updatecheck version="' +
				process.env.PUBLISHED_VERSION +
				'"/></app></gupdate>',
		};
	}

	if (process.env.FETCH_MODE === "slack-error") {
		return { ok: false, status: 500, text: async () => "internal_error" };
	}

	return { ok: true, status: 200, text: async () => "ok" };
};
`;

let workDir = "";
let preloadUrl = "";

beforeAll(() => {
	workDir = mkdtempSync(join(tmpdir(), "notify-extension-published-"));
	const preloadPath = join(workDir, "preload.mjs");

	writeFileSync(preloadPath, PRELOAD_SOURCE);
	preloadUrl = pathToFileURL(preloadPath).href;
});

const repoVersion = readExtensionVersion();
const webhookEnv = { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/x" };

/** 시크릿·Slack 환경변수가 개발 기기에서 새어 들어오지 않도록 깨끗한 env로 실행합니다. */
const runScript = (env: Record<string, string>) => {
	const suffix = Math.random().toString(36).slice(2);
	const fetchLog = join(workDir, `fetch-${suffix}.log`);
	const outputFile = join(workDir, `output-${suffix}.txt`);

	writeFileSync(fetchLog, "");
	writeFileSync(outputFile, "");

	const result = spawnSync("node", ["--import", preloadUrl, SCRIPT_PATH], {
		encoding: "utf8",
		env: {
			PATH: process.env.PATH ?? "",
			FETCH_LOG: fetchLog,
			GITHUB_OUTPUT: outputFile,
			...env,
		},
	});

	const requests = readFileSync(fetchLog, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as { url: string; body: Record<string, unknown> });

	return {
		status: result.status,
		stderr: result.stderr,
		output: readFileSync(outputFile, "utf8"),
		slackRequests: requests.filter((request) =>
			request.url.startsWith("https://hooks.slack.com/"),
		),
	};
};

describe("notify-extension-published.mjs", () => {
	it("게시본이 레포 버전과 같으면 Slack에 알리고 notified를 남긴다", () => {
		const result = runScript({ PUBLISHED_VERSION: repoVersion, ...webhookEnv });

		expect(result.status).toBe(0);
		expect(result.slackRequests).toHaveLength(1);
		expect(result.slackRequests[0].body.text).toBe(
			`🧩 확장 v${repoVersion} 웹스토어 게시 완료`,
		);
		expect(result.output).toBe("notified=true\n");
	});

	// 심사 중에는 게시본이 한 버전 뒤처져 있다
	it("게시본이 레포 버전과 다르면 아무것도 보내지 않는다", () => {
		const result = runScript({ PUBLISHED_VERSION: "0.0.1", ...webhookEnv });

		expect(result.status).toBe(0);
		expect(result.slackRequests).toHaveLength(0);
		expect(result.output).toBe("");
	});

	it("게시 버전 조회가 실패하면 경고만 남기고 성공 종료한다", () => {
		const result = runScript({ FETCH_MODE: "store-error", ...webhookEnv });

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::웹스토어 게시 버전 조회 실패");
		expect(result.slackRequests).toHaveLength(0);
		expect(result.output).toBe("");
	});

	// notified를 남기면 캐시에 표시가 찍혀 다음 실행이 재시도하지 않는다
	it("Slack 전송이 실패하면 notified를 남기지 않는다", () => {
		const result = runScript({
			PUBLISHED_VERSION: repoVersion,
			FETCH_MODE: "slack-error",
			...webhookEnv,
		});

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::Slack 전송 실패");
		expect(result.output).toBe("");
	});
});
