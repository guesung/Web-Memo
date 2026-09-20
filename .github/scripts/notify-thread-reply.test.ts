import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
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

		// 이 댓글은 그 서비스의 버튼을 따로 누르는 자리라 모달에서 대상을 다시 고르게 하지 않는다
		it.each(["web", "extension", "app"])(
			"%s 댓글의 다른 버전 버튼은 그 대상으로 고정된 값을 싣는다",
			(target) => {
				const payload = readPayload({
					TARGET: target,
					CHANGED: "true",
					RESULT: "success",
					GITHUB_SHA: commitSha,
				});
				const custom = payload.blocks[1].elements.find(
					(element: { action_id: string }) =>
						element.action_id === "deploy_custom",
				);

				expect(JSON.parse(custom.value)).toEqual({ ref: commitSha, target });
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

	describe("확장 다운로드 버튼", () => {
		const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();

		/** GitHub API를 흉내 내는 로컬 서버를 띄우고 스크립트를 비동기로 돌립니다(spawnSync는 서버를 막습니다). */
		const runWithFakeGithub = async ({
			artifacts,
			status = 200,
			env = {},
		}: {
			artifacts: Array<{ id: number; name: string; expired?: boolean }>;
			status?: number;
			env?: Record<string, string>;
		}) => {
			const server = createServer((_request, response) => {
				response.statusCode = status;
				response.setHeader("content-type", "application/json");
				response.end(JSON.stringify({ artifacts }));
			});
			await new Promise<void>((resolve) =>
				server.listen(0, "127.0.0.1", resolve),
			);
			const { port } = server.address() as { port: number };

			try {
				return await new Promise<{ status: number | null; stdout: string }>(
					(resolve) => {
						const child = spawn("node", [SCRIPT_PATH], {
							env: {
								PATH: process.env.PATH ?? "",
								GITHUB_REPOSITORY: "guesung/Web-Memo",
								GITHUB_RUN_ID: "123",
								GITHUB_SHA: commitSha,
								GITHUB_API_URL: `http://127.0.0.1:${port}`,
								GH_TOKEN: "t0ken",
								TARGET: "extension",
								CHANGED: "true",
								RESULT: "success",
								SLACK_THREAD_TS: "1.1",
								...env,
							},
						});
						let stdout = "";
						child.stdout.on("data", (chunk) => {
							stdout += chunk;
						});
						child.on("close", (code) => resolve({ status: code, stdout }));
					},
				);
			} finally {
				server.close();
			}
		};

		const actionIds = (stdout: string) =>
			JSON.parse(stdout).blocks[1].elements.map(
				(element: { action_id: string }) => element.action_id,
			);

		it("확장 성공이면 이 실행의 확장 아티팩트를 받는 링크가 붙는다", async () => {
			const result = await runWithFakeGithub({
				artifacts: [
					{ id: 1, name: "store-package-extension-production-v1.10.14" },
					{ id: 2, name: "extension-production-v1.10.14" },
				],
			});
			const elements = JSON.parse(result.stdout).blocks[1].elements;

			expect(result.status).toBe(0);
			expect(actionIds(result.stdout)).toEqual([
				"deploy_extension",
				"deploy_custom",
				"download_extension",
				"open_link",
			]);
			expect(elements[2].url).toBe(
				"https://github.com/guesung/Web-Memo/actions/runs/123/artifacts/2",
			);
		});

		it("확장 아티팩트가 없으면 다운로드 버튼만 빠지고 나머지는 그대로 나간다", async () => {
			const result = await runWithFakeGithub({ artifacts: [] });

			expect(result.status).toBe(0);
			expect(actionIds(result.stdout)).toEqual([
				"deploy_extension",
				"deploy_custom",
				"open_link",
			]);
		});

		it("목록 조회가 실패해도 알림은 나가고 다운로드 버튼만 빠진다", async () => {
			const result = await runWithFakeGithub({ artifacts: [], status: 403 });

			expect(result.status).toBe(0);
			expect(actionIds(result.stdout)).not.toContain("download_extension");
		});

		it("GH_TOKEN이 없으면 조회하지 않고 다운로드 버튼이 빠진다", async () => {
			const result = await runWithFakeGithub({
				artifacts: [{ id: 2, name: "extension-production-v1.10.14" }],
				env: { GH_TOKEN: "" },
			});

			expect(actionIds(result.stdout)).not.toContain("download_extension");
		});

		it("웹·앱 댓글에는 다운로드 버튼이 없다", async () => {
			const result = await runWithFakeGithub({
				artifacts: [{ id: 2, name: "extension-production-v1.10.14" }],
				env: { TARGET: "web" },
			});

			expect(actionIds(result.stdout)).not.toContain("download_extension");
		});

		// 빌드가 실패한 커밋의 산출물을 내려받게 하지 않는다
		it("확장 실패 댓글에는 다운로드 버튼이 없다", async () => {
			const result = await runWithFakeGithub({
				artifacts: [{ id: 2, name: "extension-production-v1.10.14" }],
				env: { RESULT: "failure" },
			});

			expect(JSON.stringify(JSON.parse(result.stdout))).not.toContain(
				"download_extension",
			);
		});
	});

	it("TARGET이 없어도 던지지 않고 경고와 exit 0이다", () => {
		const result = runScript({ CHANGED: "true", RESULT: "success" });

		expect(result.status).toBe(0);
		expect(result.stderr).toContain("::warning::");
	});
});
