#!/usr/bin/env node
/**
 * 미사용 파일을 정리하는 PR을 엽니다.
 * .github/workflows/chore-cleanup-unused.yml 이 주 1회(+수동) 호출합니다.
 *
 * 흐름은 하나뿐입니다.
 *   열린 정리 PR 확인 → knip → 안전/회색 분류 → 항목별 커밋으로 삭제
 *   → 검증 게이트 → 통과한 것만 남겨 master로 PR
 *
 * 로컬에서 그대로 돌려볼 수 있습니다. 삭제도 PR도 하지 않고 분류 결과만 찍습니다:
 *
 *   GITHUB_REPOSITORY=guesung/Web-Memo CLEANUP_DRY_RUN=true \
 *   node .github/scripts/cleanup/cleanup-unused-files.mjs
 *
 * 분기 1·2·3을 검증하려면 knip을 돌리는 대신 결과를 주입할 수 있습니다:
 *
 *   KNIP_REPORT_PATH=/tmp/knip.json CLEANUP_DRY_RUN=true \
 *   node .github/scripts/cleanup/cleanup-unused-files.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
	buildCommitMessage,
	buildPrBody,
	CLEANUP_LABEL,
	classifyCandidates,
} from "./cleanup-report.mjs";
import { requireEnv } from "../shared/run-context.mjs";

/**
 * 삭제 뒤 통과해야 하는 게이트입니다. ci.yml의 ci 잡과 같은 순서·같은 명령입니다.
 *
 * boundaries가 맨 앞인 것도 ci와 같습니다. 파일을 지우면 패키지 간 의존 방향이
 * 깨질 수 있는데, 그건 type-check가 아니라 boundaries만 잡습니다.
 *
 * type-check에 --affected를 쓰지 않습니다. 삭제는 지워진 파일을 참조하던 쪽에서
 * 터지는데, --affected가 그 워크스페이스를 그래프에 넣는다는 보장이 없습니다.
 */
const VERIFICATION_STEPS = [
	["pnpm", ["exec", "turbo", "boundaries", "--filter=./packages/*"]],
	["pnpm", ["check"]],
	["pnpm", ["exec", "turbo", "type-check"]],
	["pnpm", ["test:jest", "--run"]],
];

const run = (command, args) =>
	execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const runInherit = (command, args) =>
	execFileSync(command, args, { stdio: "inherit" });

/**
 * 열려 있는 자동 정리 PR이 있는가.
 *
 * 있으면 이번 회차는 아무것도 하지 않습니다. 방치된 자동 PR이 쌓이면
 * 레포가 시끄러워지고, 시끄러워지는 순간 사람이 알림을 통째로 끕니다.
 */
const findOpenCleanupPr = (repository) => {
	const raw = run("gh", [
		"pr",
		"list",
		"--repo",
		repository,
		"--state",
		"open",
		"--label",
		CLEANUP_LABEL,
		"--json",
		"number,url",
	]);
	const [first] = JSON.parse(raw);

	return first ?? null;
};

/**
 * knip이 낸 미사용 파일 목록.
 *
 * knip은 발견이 있으면 종료 코드 1로 끝납니다. 실패가 아니므로 stdout을 그대로 읽습니다.
 * 반대로 설정이 깨져 아무것도 못 읽은 경우와 구별해야 하므로, JSON 파싱에
 * 실패하면 던집니다 — 빈 목록으로 흘려보내면 "정리할 게 없다"로 조용히 끝납니다.
 */
const readUnusedFiles = () => {
	const injectedPath = process.env.KNIP_REPORT_PATH;
	const raw = injectedPath
		? readFileSync(injectedPath, "utf8")
		: runKnip();

	const start = raw.indexOf('{"issues"');

	if (start === -1) {
		throw new Error("knip 결과에서 issues를 찾지 못했습니다");
	}

	const report = JSON.parse(raw.slice(start).split("\n")[0]);

	return report.issues.map((issue) => issue.file);
};

const runKnip = () => {
	try {
		return run("pnpm", ["knip", "--reporter", "json"]);
	} catch (error) {
		// 발견이 있으면 종료 코드 1입니다. stdout에 결과가 실려 있습니다.
		if (error.stdout) {
			return error.stdout.toString();
		}

		throw error;
	}
};

const readKnipVersion = () => {
	const pkg = JSON.parse(readFileSync("package.json", "utf8"));

	return pkg.devDependencies?.knip ?? "unknown";
};

/**
 * 검증 게이트를 돌립니다. 실패한 스텝에서 멈추고 그 지점을 알려줍니다.
 */
const verify = () => {
	const results = [];

	for (const [command, args] of VERIFICATION_STEPS) {
		const label = [command, ...args].join(" ");

		try {
			runInherit(command, args);
			results.push({ command: label, passed: true });
		} catch {
			results.push({ command: label, passed: false });

			return { passed: false, results };
		}
	}

	return { passed: true, results };
};

/**
 * 항목 하나를 지우고 커밋합니다.
 *
 * `git rm`으로 지웁니다 — 인덱스와 워킹트리가 한 번에 정리되고, 이번 작업이
 * 만든 변경만 스테이징된다는 것이 명령 자체로 보장됩니다.
 */
const deleteAndCommit = (candidatePath) => {
	runInherit("git", ["rm", "--quiet", candidatePath]);
	runInherit("git", ["commit", "--quiet", "-m", buildCommitMessage(candidatePath)]);

	return run("git", ["rev-parse", "--short", "HEAD"]).trim();
};

const main = async () => {
	const repository = requireEnv("GITHUB_REPOSITORY");
	const isDryRun = process.env.CLEANUP_DRY_RUN === "true";

	if (!isDryRun) {
		const openPr = findOpenCleanupPr(repository);

		if (openPr) {
			console.log(
				`열린 정리 PR이 있어 이번 회차는 건너뜁니다: ${openPr.url}`,
			);

			return;
		}
	}

	const unusedFiles = readUnusedFiles();

	console.log(`knip 미사용 파일: ${unusedFiles.length}건`);

	if (unusedFiles.length === 0) {
		console.log("후보가 없어 PR 없이 끝냅니다.");

		return;
	}

	const { safe, gray } = classifyCandidates(unusedFiles);

	console.log(`안전 ${safe.length}건 · 회색 ${gray.length}건`);

	for (const item of gray) {
		console.log(`  회색: ${item.path} — ${item.reason}`);
	}

	if (safe.length === 0) {
		console.log("안전 후보가 없어 PR 없이 끝냅니다.");

		return;
	}

	if (isDryRun) {
		console.log("\nCLEANUP_DRY_RUN=true — 삭제도 PR도 하지 않습니다.");
		console.log(`삭제 대상 ${safe.length}건:`);

		for (const path of safe) {
			console.log(`  - ${path}`);
		}

		return;
	}

	const today = new Date().toISOString().slice(0, 10);
	const branch = `chore/auto-cleanup-${today}`;

	runInherit("git", [
		"config",
		"user.name",
		process.env.GIT_USER_NAME ?? "github-actions[bot]",
	]);
	runInherit("git", [
		"config",
		"user.email",
		process.env.GIT_USER_EMAIL ??
			"41898282+github-actions[bot]@users.noreply.github.com",
	]);
	runInherit("git", ["switch", "--create", branch]);

	const deleted = safe.map((path) => ({
		path,
		commit: deleteAndCommit(path),
	}));

	// 검증이 깨지면 마지막 커밋부터 되돌리며 다시 봅니다. 되돌린 항목은 회색으로
	// 내려가 PR 본문에 사유와 함께 남습니다. 반복은 삭제 항목 수를 넘지 않습니다.
	let verification = verify();

	while (!verification.passed && deleted.length > 0) {
		const reverted = deleted.pop();
		const failedStep = verification.results.at(-1).command;

		console.log(
			`검증 실패(${failedStep}) — ${reverted.path} 삭제를 되돌립니다.`,
		);

		runInherit("git", ["reset", "--hard", "--quiet", "HEAD~1"]);
		gray.push({
			path: reverted.path,
			reason: `삭제하면 검증이 깨집니다 (\`${failedStep}\`)`,
		});

		verification = verify();
	}

	if (deleted.length === 0) {
		console.log("되돌린 끝에 남은 항목이 없어 PR 없이 끝냅니다.");

		return;
	}

	runInherit("git", ["push", "--quiet", "origin", branch]);
	runInherit("gh", [
		"pr",
		"create",
		"--repo",
		repository,
		"--base",
		"master",
		"--head",
		branch,
		"--title",
		`chore: 미사용 파일 ${deleted.length}건을 정리한다`,
		"--body",
		buildPrBody({
			deleted,
			gray,
			verification: verification.results,
			knipVersion: readKnipVersion(),
		}),
		"--label",
		CLEANUP_LABEL,
	]);
};

await main();
