import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireEnv } from "../shared/run-context.mjs";
import {
	decideStagingApp,
	isValidatedRun,
	readDeploymentShas,
} from "./appDeploymentState.mjs";

export function prepareStagingApp({ platform, repository, runId }) {
	// 판정 실패도 실패 알림 대상입니다. 생략이 확정됐을 때만 false로 바꿉니다.
	writeOutput({ attempted: "true", should_build: "false" });
	const sha = git(["rev-parse", "HEAD"]);
	git([
		"fetch",
		"--no-tags",
		"origin",
		"+refs/heads/develop:refs/remotes/origin/develop",
	]);
	const branchSha = git(["rev-parse", "origin/develop"]);
	const isAncestor = createAncestryChecker();
	if (!isAncestor(sha, branchSha)) {
		finishSkip("현재 develop 계보에서 제외된 후보");
		return;
	}

	const runs = githubList({
		endpoint: `repos/${repository}/actions/workflows/ci.yml/runs?branch=develop&event=push&per_page=100`,
		key: "workflow_runs",
	});
	const validatedShas = [];
	for (const run of runs) {
		if (
			String(run.id) === runId ||
			run.head_sha === sha ||
			!isAncestor(run.head_sha, branchSha) ||
			!isAncestor(sha, run.head_sha)
		) {
			continue;
		}
		const jobs = githubList({
			endpoint: `repos/${repository}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`,
			key: "jobs",
		});
		if (isValidatedRun({ jobs })) validatedShas.push(run.head_sha);
	}

	const artifacts = githubList({
		endpoint: `repos/${repository}/actions/artifacts?per_page=100`,
		key: "artifacts",
	});
	const decision = decideStagingApp({
		sha,
		branchSha,
		validatedShas,
		deployedShas: readDeploymentShas({ artifacts, platform }),
		isAncestor,
	});
	if (!decision.shouldBuild) {
		finishSkip(decision.reason);
		return;
	}

	console.log(decision.reason);
	if (decision.baseSha && !hasAppChanges({ baseSha: decision.baseSha })) {
		finishSkip("마지막 앱 배포 이후 앱 변경 없음");
		return;
	}
	writeOutput({ should_build: "true" });
}

export function recordStagingApp({ platform, runId, attempt, directory }) {
	const sha = git(["rev-parse", "HEAD"]);
	mkdirSync(directory, { recursive: true });
	writeFileSync(
		join(directory, "deployment.json"),
		JSON.stringify({ sha, platform, runId, attempt }),
	);
	writeOutput({
		marker_name: `staging-app-success-${platform}-${sha}-${runId}-${attempt}`,
	});
}

function finishSkip(reason) {
	console.log(`앱 빌드 생략: ${reason}`);
	writeOutput({ attempted: "false", should_build: "false" });
}

function hasAppChanges({ baseSha }) {
	const output = execFileSync(
		"bash",
		[fileURLToPath(new URL("./detect-affected-apps.sh", import.meta.url))],
		{
			encoding: "utf8",
			env: { ...process.env, BASE_REF: baseSha, GITHUB_OUTPUT: "/dev/stdout" },
		},
	);
	const match = /^app=(true|false)$/m.exec(output);
	if (!match) throw new Error("앱 영향 판정 결과가 없습니다");
	console.log(output.trim());
	return match[1] === "true";
}

function githubList({ endpoint, key }) {
	const pages = JSON.parse(
		execFileSync("gh", ["api", "--paginate", "--slurp", endpoint], {
			encoding: "utf8",
			maxBuffer: 32 * 1024 * 1024,
		}),
	);
	return pages.flatMap((page) => {
		if (!Array.isArray(page[key]))
			throw new Error(`GitHub ${key} 응답 형식 오류`);
		return page[key];
	});
}

function createAncestryChecker() {
	const cache = new Map();
	return (ancestor, descendant) => {
		const key = `${ancestor}:${descendant}`;
		if (cache.has(key)) return cache.get(key);
		// reset으로 사라진 커밋은 현재 계보의 후보나 성공 기준이 아닙니다.
		if (
			spawnSync("git", ["cat-file", "-e", `${ancestor}^{commit}`]).status !== 0
		) {
			cache.set(key, false);
			return false;
		}
		const result = spawnSync("git", [
			"merge-base",
			"--is-ancestor",
			ancestor,
			descendant,
		]);
		if (![0, 1].includes(result.status))
			throw new Error("커밋 계보를 확인하지 못했습니다");
		cache.set(key, result.status === 0);
		return result.status === 0;
	};
}

function git(args) {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function writeOutput(values) {
	const content = Object.entries(values)
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	appendFileSync(requireEnv("GITHUB_OUTPUT"), `${content}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		const input = {
			platform: requireEnv("APP_PLATFORM"),
			runId: requireEnv("GITHUB_RUN_ID"),
		};
		if (!["android", "ios"].includes(input.platform))
			throw new Error("앱 플랫폼 오류");
		if (process.argv.includes("--record")) {
			recordStagingApp({
				...input,
				attempt: requireEnv("GITHUB_RUN_ATTEMPT"),
				directory: requireEnv("APP_DEPLOYMENT_DIRECTORY"),
			});
		} else {
			prepareStagingApp({
				...input,
				repository: requireEnv("GITHUB_REPOSITORY"),
			});
		}
	} catch (error) {
		console.error(`::error::${error.message}`);
		process.exitCode = 1;
	}
}
