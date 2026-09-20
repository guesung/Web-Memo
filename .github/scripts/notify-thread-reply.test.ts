import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
	new URL("./notify-thread-reply.mjs", import.meta.url),
);

/** 시크릿·Slack 환경변수가 개발 기기에서 새어 들어오지 않도록 깨끗한 env로 실행합니다. */
const runScript = (env: Record<string, string>) => {
	const result = spawnSync("node", [SCRIPT_PATH], {
		encoding: "utf8",
		env: {
			PATH: process.env.PATH ?? "",
			GITHUB_REPOSITORY: "guesung/Web-Memo",
			GITHUB_RUN_ID: "123",
			...env,
		},
	});

	return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

describe("notify-thread-reply.mjs", () => {
	it("thread_ts가 비면 경고만 남기고 아무것도 보내지 않으며 exit 0이다", () => {
		const result = runScript({
			TARGET: "web",
			CHANGED: "true",
			RESULT: "success",
			SLACK_THREAD_TS: "",
			SLACK_BOT_TOKEN: "xoxb-t",
			SLACK_CHANNEL_ID: "C1",
		});

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::");
		expect(result.stderr).toContain("ts");
		expect(result.stdout).toBe("");
	});

	it("댓글 대상이 아니면(changed=false) thread_ts가 비어도 경고 없이 끝난다", () => {
		const result = runScript({
			TARGET: "app",
			CHANGED: "false",
			RESULT: "skipped",
			SLACK_THREAD_TS: "",
		});

		expect(result.status).toBe(0);
		expect(result.stderr).not.toContain("::warning::");
	});

	it.each(["cancelled", "skipped"])(
		"changed=true라도 result=%s이면 아무것도 보내지 않고 exit 0이다",
		(resultValue) => {
			const result = runScript({
				TARGET: "extension",
				CHANGED: "true",
				RESULT: resultValue,
				SLACK_THREAD_TS: "1.1",
			});

			expect(result.status).toBe(0);
			expect(result.stdout).not.toContain("{");
		},
	);

	it("봇 토큰이 없으면 페이로드만 stdout에 찍고 exit 0이다", () => {
		const result = runScript({
			TARGET: "extension",
			CHANGED: "true",
			RESULT: "failure",
			SLACK_THREAD_TS: "1.1",
		});

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::");
		expect(JSON.parse(result.stdout).text).toBe("확장 빌드 실패");
		expect(result.stdout).toContain(
			"https://github.com/guesung/Web-Memo/actions/runs/123",
		);
	});

	describe("빌드 성공 댓글의 버튼", () => {
		const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();

		/** 봇 토큰 없이 돌려 stdout에 찍힌 페이로드를 읽습니다. */
		const readPayload = (env: Record<string, string>) => {
			const result = runScript({ SLACK_THREAD_TS: "1.1", ...env });

			return JSON.parse(result.stdout);
		};

		it.each([
			["web", "deploy_web"],
			["extension", "deploy_extension"],
			["app", "deploy_app"],
		])(
			"%s 성공이면 그 타깃의 배포 · 다른 버전 · 워크플로 버튼이 붙는다",
			(target, deployActionId) => {
				const payload = readPayload({
					TARGET: target,
					CHANGED: "true",
					RESULT: "success",
					GITHUB_SHA: commitSha,
				});
				const actions = payload.blocks[1];

				expect(actions.type).toBe("actions");
				expect(
					actions.elements.map((element: { action_id: string }) => element.action_id),
				).toEqual([deployActionId, "deploy_custom", "open_link"]);
				expect(JSON.parse(actions.elements[0].value)).toMatchObject({
					target,
					ref: commitSha,
				});
				expect(actions.elements[2].url).toBe(
					"https://github.com/guesung/Web-Memo/actions/runs/123",
				);
			},
		);

		it("다른 타깃의 배포 버튼은 붙지 않는다", () => {
			const payload = readPayload({
				TARGET: "web",
				CHANGED: "true",
				RESULT: "success",
				GITHUB_SHA: commitSha,
			});

			expect(JSON.stringify(payload)).not.toContain("deploy_app");
			expect(JSON.stringify(payload)).not.toContain("deploy_extension");
		});

		// 빌드도 안 된 커밋을 올리는 길을 열어두지 않는다
		it("실패 댓글에는 버튼 없이 로그 링크만 붙는다", () => {
			const payload = readPayload({
				TARGET: "web",
				CHANGED: "true",
				RESULT: "failure",
				GITHUB_SHA: commitSha,
			});

			expect(payload.blocks[1].type).toBe("context");
			expect(JSON.stringify(payload)).not.toContain("deploy_");
		});

		it("커밋을 모르면(GITHUB_SHA 없음) 버튼 없이 로그 링크만 붙는다", () => {
			const payload = readPayload({
				TARGET: "web",
				CHANGED: "true",
				RESULT: "success",
			});

			expect(payload.blocks[1].type).toBe("context");
			expect(JSON.stringify(payload)).not.toContain("deploy_");
		});
	});

	it("TARGET이 없어도 던지지 않고 경고와 exit 0이다", () => {
		const result = runScript({ CHANGED: "true", RESULT: "success" });

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::");
	});
});
