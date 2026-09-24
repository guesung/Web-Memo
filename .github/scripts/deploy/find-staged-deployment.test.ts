import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
	new URL("./find-staged-deployment.mjs", import.meta.url),
);
const SHA = "8ae32c1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const STAGED = {
	uid: "dpl_1",
	url: "web-memo-aaa.vercel.app",
	created: 1000,
	state: "READY",
	target: "production",
	meta: { releaseSha: SHA },
};

/**
 * Vercel API를 흉내 내는 로컬 서버를 띄우고, 임시 작업 디렉터리에서 스크립트를 돌려
 * GITHUB_OUTPUT에 기록된 값을 돌려줍니다. spawnSync는 같은 프로세스의 서버를 막으므로 비동기입니다.
 */
const runScript = async ({
	status = 200,
	deployments = [],
	projectJson = { projectId: "prj_1", orgId: "team_1" },
	env = {},
}: {
	status?: number;
	deployments?: object[];
	projectJson?: object | null;
	env?: Record<string, string>;
}) => {
	const workDir = mkdtempSync(join(tmpdir(), "staged-"));
	const outputFile = join(workDir, "github-output");

	writeFileSync(outputFile, "");

	if (projectJson) {
		mkdirSync(join(workDir, ".vercel"));
		writeFileSync(join(workDir, ".vercel/project.json"), JSON.stringify(projectJson));
	}

	const requests: string[] = [];
	const server = createServer((request, response) => {
		requests.push(request.url ?? "");
		response.statusCode = status;
		response.setHeader("content-type", "application/json");
		response.end(JSON.stringify({ deployments }));
	});

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as { port: number };

	try {
		const exitCode = await new Promise<number | null>((resolve) => {
			const child = spawn("node", [SCRIPT_PATH], {
				cwd: workDir,
				env: {
					PATH: process.env.PATH ?? "",
					GITHUB_OUTPUT: outputFile,
					VERCEL_API_URL: `http://127.0.0.1:${port}`,
					VERCEL_TOKEN: "t0ken",
					SHA,
					...env,
				},
			});
			child.on("close", resolve);
		});
		const outputs = Object.fromEntries(
			readFileSync(outputFile, "utf8")
				.split("\n")
				.filter(Boolean)
				.map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
		);

		return { exitCode, outputs, requests };
	} finally {
		server.close();
	}
};

describe("find-staged-deployment.mjs", () => {
	it("이 커밋의 미승격 배포가 있으면 found=true와 URL을 기록한다", async () => {
		const { exitCode, outputs, requests } = await runScript({
			deployments: [STAGED],
		});

		expect(exitCode).toBe(0);
		expect(outputs).toEqual({
			found: "true",
			url: "https://web-memo-aaa.vercel.app",
			id: "dpl_1",
		});
		expect(requests[0]).toContain("projectId=prj_1");
		expect(requests[0]).toContain("teamId=team_1");
	});

	it("이 커밋의 배포가 없으면 found=false이고 exit 0이다", async () => {
		const { exitCode, outputs } = await runScript({
			deployments: [{ ...STAGED, meta: { releaseSha: "other" } }],
		});

		expect(exitCode).toBe(0);
		expect(outputs).toEqual({ found: "false" });
	});

	// 조회 실패가 릴리스를 막으면 안 된다. 재빌드로 내려간다.
	it("API가 실패해도 found=false로 기록하고 exit 0이다", async () => {
		const { exitCode, outputs } = await runScript({ status: 500 });

		expect(exitCode).toBe(0);
		expect(outputs).toEqual({ found: "false" });
	});

	it("프로젝트 링크 파일이 없어도 found=false로 기록하고 exit 0이다", async () => {
		const { exitCode, outputs } = await runScript({
			projectJson: null,
			deployments: [STAGED],
		});

		expect(exitCode).toBe(0);
		expect(outputs).toEqual({ found: "false" });
	});

	it("토큰이 없으면 조회하지 않고 found=false이다", async () => {
		const { exitCode, outputs, requests } = await runScript({
			deployments: [STAGED],
			env: { VERCEL_TOKEN: "" },
		});

		expect(exitCode).toBe(0);
		expect(outputs).toEqual({ found: "false" });
		expect(requests).toHaveLength(0);
	});

	it("SHA가 없으면 조회하지 않고 found=false이다", async () => {
		const { outputs, requests } = await runScript({
			deployments: [STAGED],
			env: { SHA: "" },
		});

		expect(outputs).toEqual({ found: "false" });
		expect(requests).toHaveLength(0);
	});
});
