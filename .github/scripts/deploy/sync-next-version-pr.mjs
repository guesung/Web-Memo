#!/usr/bin/env node
/**
 * 배포가 성공한 트랙의 "다음 버전" PR을 하나 열어 둡니다. release.yml의 next-version-* 잡이 호출합니다.
 *
 * - 다음 버전 = 배포한 ref 트리의 버전 + patch. 현재 master 버전이 아닙니다(배포한 ref가 master보다 뒤일 수 있음).
 * - 브랜치 내용 = origin/master 최신 + 버전 파일 한 줄만 바꾼 커밋 1개. 트랙당 고정 브랜치·PR 하나.
 * - 열린 PR이 없으면 만들고, 있으면 같은 브랜치를 force 갱신하고 제목·본문을 고칩니다.
 * - master 버전이 이미 다음 버전 이상이면(누가 손으로 올렸으면) 아무것도 만들지 않습니다.
 *   이미 열린 PR이 있어도 닫지 않고 그 사실만 로그로 남깁니다.
 * - 자동 머지는 하지 않습니다. "버전은 실제 배포 때만 움직인다"(docs/versioning.md)는 원칙에 따라
 *   Slack에서 버전 올려 배포를 고르면 서버가 머지합니다.
 *
 * 알림이 아니라 기능이므로 실패하면 exit 1로 잡을 빨갛게 합니다.
 *
 * 환경 변수
 *   TRACK           extension | app (필수)
 *   DEPLOY_REF      배포한 커밋/ref (기본 HEAD — 워크플로가 ref를 체크아웃한 상태)
 *   RELEASE_RUN_URL release 실행 링크 (선택, PR 본문에 넣습니다)
 *   GH_TOKEN        gh CLI 토큰(GitHub App 토큰). CI가 도는 PR을 열려면 GITHUB_TOKEN이 아니어야 합니다
 *   GIT_USER_NAME / GIT_USER_EMAIL  커밋 작성자
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
	bumpVersion,
	compareSemver,
	parseSemver,
	replaceVersionInJson,
} from "../shared/version.mjs";

const MASTER = "master";

/** 트랙별 버전 파일과 그 안에서 버전을 꺼내는 방법. */
export const TRACKS = {
	extension: {
		label: "확장",
		file: "apps/chrome-extension/package.json",
		readVersion: (json) => json.version,
	},
	app: {
		label: "앱",
		file: "apps/app/app.json",
		readVersion: (json) => json.expo?.version,
	},
};

export const branchFor = (track) => `chore/next-version-${track}`;

export const buildPrTitle = ({ track, nextVersion }) =>
	`chore: ${TRACKS[track].label} 버전을 ${nextVersion}로 올린다`;

export const MERGE_WARNING =
	"직접 머지하지 마세요. Slack에서 버전 올려 배포를 고르면 이 PR이 머지되고 배포됩니다.";

export const buildPrBody = ({
	track,
	deployedVersion,
	nextVersion,
	deployRef,
	runUrl,
}) => {
	const lines = [
		"## 설명",
		"",
		MERGE_WARNING,
		"",
		`${TRACKS[track].label} ${deployedVersion} 배포 뒤 자동으로 연 다음 버전 PR입니다. \`${TRACKS[track].file}\`의 버전 한 줄만 ${nextVersion}로 바꿉니다.`,
		"",
		`- 배포된 버전: ${deployedVersion}`,
		`- 배포 ref: \`${deployRef}\``,
	];

	if (runUrl) {
		lines.push(`- release 실행: ${runUrl}`);
	}

	return `${lines.join("\n")}\n`;
};

/** 다음 버전 계산. 배포한 ref의 버전에서 patch만 올립니다. */
export const computeNextVersion = (deployedVersion) =>
	bumpVersion(deployedVersion, "patch");

/**
 * PR에 할 일을 정합니다.
 * master가 이미 다음 버전 이상이면 만들 필요가 없으므로 noop입니다(열린 PR이 있으면 reason에 남겨 로그로 알립니다).
 */
export const decideNextVersionPr = ({
	nextVersion,
	masterVersion,
	openPrNumber,
}) => {
	const next = parseSemver(nextVersion);
	const master = parseSemver(masterVersion);

	if (!next || !master) {
		throw new Error(
			`semver 형식이 아닙니다 (다음 ${nextVersion}, master ${masterVersion})`,
		);
	}

	if (compareSemver(master, next) >= 0) {
		return {
			action: "noop",
			reason: openPrNumber ? "master-ahead-open-pr" : "master-ahead",
		};
	}

	return { action: openPrNumber ? "update" : "create", reason: "behind" };
};

const run = (command, args) =>
	execFileSync(command, args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();

const runInherit = (command, args) => {
	execFileSync(command, args, { stdio: "inherit" });
};

const tryRun = (command, args) => {
	try {
		return run(command, args);
	} catch {
		return null;
	}
};

const readVersionAt = (revision, track) => {
	const { file, readVersion } = TRACKS[track];
	const source = run("git", ["show", `${revision}:${file}`]);
	const version = readVersion(JSON.parse(source));

	if (typeof version !== "string") {
		throw new Error(`${revision}:${file}에서 버전을 읽지 못했습니다`);
	}

	return { source, version };
};

/** 배포 ref를 커밋 SHA로 풉니다. 브랜치 이름이면 로컬에 없을 수 있어 origin/ 쪽도 봅니다. */
const resolveCommit = (ref) => {
	const sha =
		tryRun("git", ["rev-parse", "--verify", `${ref}^{commit}`]) ??
		tryRun("git", ["rev-parse", "--verify", `origin/${ref}^{commit}`]);

	if (!sha) {
		throw new Error(`배포 ref를 찾지 못했습니다: ${ref}`);
	}

	return sha;
};

const findOpenPrNumber = (branch) => {
	const number = run("gh", [
		"pr",
		"list",
		"--head",
		branch,
		"--base",
		MASTER,
		"--state",
		"open",
		"--json",
		"number",
		"--jq",
		".[0].number // empty",
	]);

	return number ? Number(number) : null;
};

/** 열린 PR의 브랜치가 이미 "최신 master + 이 버전 커밋 하나"이면 다시 push하지 않습니다(같은 내용으로 CI를 또 돌리지 않기 위해서). */
const isBranchCurrent = ({ branch, track, masterSha, nextVersion }) => {
	if (tryRun("git", ["fetch", "--quiet", "origin", branch]) === null) {
		return false;
	}

	const branchSha = run("git", ["rev-parse", "FETCH_HEAD"]);

	if (tryRun("git", ["rev-parse", `${branchSha}^`]) !== masterSha) {
		return false;
	}

	return readVersionAt(branchSha, track).version === nextVersion;
};

const pushVersionCommit = ({
	branch,
	track,
	masterSha,
	masterSource,
	masterVersion,
	nextVersion,
	title,
}) => {
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
	runInherit("git", ["switch", "--force-create", branch, masterSha]);
	writeFileSync(
		TRACKS[track].file,
		replaceVersionInJson({
			source: masterSource,
			currentVersion: masterVersion,
			nextVersion,
		}),
	);
	runInherit("git", ["add", TRACKS[track].file]);
	runInherit("git", ["commit", "--quiet", "--message", title]);
	// 브랜치는 이 자동화만 씁니다. 매번 최신 master 위에 커밋 하나로 다시 세워 이력이 쌓이지 않게 합니다.
	runInherit("git", ["push", "--quiet", "--force", "origin", branch]);
};

const main = () => {
	const track = process.env.TRACK;

	if (!track || !(track in TRACKS)) {
		throw new Error(
			`TRACK은 ${Object.keys(TRACKS).join(" | ")} 중 하나여야 합니다 (받은 값: ${track})`,
		);
	}

	const branch = branchFor(track);
	const deployRef = process.env.DEPLOY_REF || "HEAD";
	const deploySha = resolveCommit(deployRef);
	const { version: deployedVersion } = readVersionAt(deploySha, track);
	const nextVersion = computeNextVersion(deployedVersion);

	runInherit("git", ["fetch", "--quiet", "origin", MASTER]);

	const masterSha = run("git", ["rev-parse", "FETCH_HEAD"]);
	const { source: masterSource, version: masterVersion } = readVersionAt(
		masterSha,
		track,
	);
	const openPrNumber = findOpenPrNumber(branch);
	const { action, reason } = decideNextVersionPr({
		nextVersion,
		masterVersion,
		openPrNumber,
	});

	console.log(
		`다음 버전 PR 동작: ${action} (${reason}) — 배포 ${deployedVersion}, 다음 ${nextVersion}, master ${masterVersion}${openPrNumber ? `, 열린 PR #${openPrNumber}` : ""}`,
	);

	if (action === "noop") {
		if (openPrNumber) {
			console.log(
				`master가 이미 ${masterVersion}라 PR을 새로 만들지 않습니다. 열린 PR #${openPrNumber}는 닫지 않고 그대로 둡니다. 필요 없으면 직접 닫으세요.`,
			);
		}

		return;
	}

	const title = buildPrTitle({ track, nextVersion });
	const body = buildPrBody({
		track,
		deployedVersion,
		nextVersion,
		deployRef: deploySha,
		runUrl: process.env.RELEASE_RUN_URL,
	});
	const branchCurrent =
		action === "update" &&
		isBranchCurrent({ branch, track, masterSha, nextVersion });

	if (branchCurrent) {
		console.log(
			"브랜치가 이미 최신 master 위의 같은 버전 커밋이라 push를 건너뜁니다.",
		);
	} else {
		pushVersionCommit({
			branch,
			track,
			masterSha,
			masterSource,
			masterVersion,
			nextVersion,
			title,
		});
	}

	if (action === "create") {
		runInherit("gh", [
			"pr",
			"create",
			"--base",
			MASTER,
			"--head",
			branch,
			"--title",
			title,
			"--body",
			body,
		]);

		return;
	}

	runInherit("gh", [
		"pr",
		"edit",
		String(openPrNumber),
		"--title",
		title,
		"--body",
		body,
	]);
};

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		main();
	} catch (error) {
		console.error(
			`::error::다음 버전 PR 갱신에 실패했습니다: ${error instanceof Error ? error.message : error}`,
		);
		process.exit(1);
	}
}
