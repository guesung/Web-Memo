#!/usr/bin/env node
/**
 * 배포 한 건을 `deploy-log` 브랜치의 타깃별 파일(web.md / extension.md / app.md)에 기록합니다.
 * .github/workflows/release-notify.yml 이 릴리스 성공 결과일 때만 호출합니다.
 *
 * 범위는 "직전에 기록한 SHA..이번 ref"이고, 직전 SHA는 파일 맨 위 항목의
 * `<!-- ref: <전체 SHA> -->` 주석에서 읽습니다(별도 상태 저장소 없음).
 *
 * 기록 실패가 알림을 막으면 안 되므로 이 스크립트는 어떤 경우에도 exit 0입니다.
 * 실패는 결과 JSON의 `ok: false`와 `error`로 다음 단계(Slack 알림)에 넘깁니다.
 *
 * 환경 변수
 *   TARGET            web | extension | app (필수)
 *   GITHUB_REPOSITORY 소유자/레포 (필수)
 *   DEPLOY_REF        배포한 커밋/ref (기본 HEAD — 워크플로가 ref를 체크아웃한 상태)
 *   DEPLOY_LOG_TOKEN  deploy-log에 push할 토큰(GitHub App 토큰). 없으면 이 체크아웃의 origin을 씁니다
 *   DEPLOY_RECORD_PATH 결과 JSON 경로 (기본 $RUNNER_TEMP/deploy-record.json)
 *   GITHUB_OUTPUT     있으면 record-ok / record-kind / record-path를 남깁니다
 *
 * 로컬 실행: GITHUB_REPOSITORY=guesung/Web-Memo TARGET=web node .github/scripts/deploy/record-deploy.mjs
 *   (origin의 deploy-log에 실제로 push하므로 시험은 fork나 임시 remote에서 하세요)
 */

import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { collectDeployPrs, RANGE } from "./collect-deploy-prs.mjs";

export const DEPLOY_LOG_BRANCH = "deploy-log";
export const TARGETS = ["web", "extension", "app"];

const TARGET_TITLES = {
	web: "# 웹 배포 기록",
	extension: "# 확장 배포 기록",
	app: "# 앱 배포 기록",
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const REF_COMMENT_PATTERN = /<!-- ref: ([0-9a-f]{40}) -->/;
const MAX_PUSH_ATTEMPTS = 3;

/** UTC 시각을 `YYYY-MM-DD HH:mm`(KST, +9시간)로 바꿉니다. */
export const formatKst = (date) =>
	new Date(date.getTime() + KST_OFFSET_MS)
		.toISOString()
		.slice(0, 16)
		.replace("T", " ");

const oneLine = (text) => text.replace(/\s+/g, " ").trim();

/** 범위 분류별 본문 줄. forward에 PR이 있을 때만 PR 줄 목록입니다. */
export const buildBodyLines = ({ kind, prs, refSha }) => {
	if (kind === RANGE.first) {
		return ["기록 시작"];
	}

	if (kind === RANGE.rollback) {
		return [`롤백 → ${refSha.slice(0, 7)}`];
	}

	if (kind === RANGE.diverged) {
		return ["master 외 ref 배포"];
	}

	if (kind === RANGE.forward && prs.length > 0) {
		return prs.map((pr) => `- #${pr.number} ${oneLine(pr.title)}`);
	}

	return ["변경된 PR 없음"];
};

/**
 * 기록 항목 한 개(끝에 개행 한 줄).
 *
 * @param {object} params
 * @param {string} params.version 확장·앱 버전, 웹은 "web"
 * @param {Date} params.deployedAt
 * @param {string} params.refSha 전체 SHA
 * @param {string} params.kind 범위 분류
 * @param {Array<{ number: number, title: string }>} params.prs
 */
export const buildEntry = ({ version, deployedAt, refSha, kind, prs }) =>
	[
		`## ${version} · ${formatKst(deployedAt)} KST · ${refSha.slice(0, 7)}`,
		`<!-- ref: ${refSha} -->`,
		"",
		...buildBodyLines({ kind, prs, refSha }),
		"",
	].join("\n");

/** 제목 줄 아래, 기존 항목들 위에 새 항목을 끼웁니다. 빈 파일이면 제목부터 만듭니다. */
export const insertEntry = ({ content, entry, target }) => {
	const title = TARGET_TITLES[target];
	const lines = content.replace(/\r\n/g, "\n").split("\n");
	const hasTitle = lines[0]?.startsWith("# ");
	const heading = hasTitle ? lines[0] : title;
	const rest = (hasTitle ? lines.slice(1) : lines)
		.join("\n")
		.replace(/^\n+/, "");

	return `${heading}\n\n${entry}${rest.trim() ? `\n${rest.replace(/\n*$/, "\n")}` : ""}`;
};

/** 파일 맨 위(= 가장 최근) 항목의 전체 SHA. 없으면 null. */
export const parseLatestRefSha = (content) =>
	REF_COMMENT_PATTERN.exec(content)?.[1] ?? null;

const gitIn = (cwd, args, env) =>
	execFileSync("git", args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, ...env },
	}).trim();

/** ref 트리에 박힌 버전. 못 읽으면 대체값을 쓰고 기록은 이어 갑니다. */
export const resolveVersion = ({ target, refSha, cwd }) => {
	const readJsonAt = (path) =>
		JSON.parse(gitIn(cwd, ["show", `${refSha}:${path}`]));

	try {
		if (target === "extension") {
			return readJsonAt("apps/chrome-extension/package.json").version;
		}

		if (target === "app") {
			return readJsonAt("apps/app/app.json").expo.version;
		}
	} catch {
		return "버전 미상";
	}

	return "web";
};

/** 토큰을 URL이 아니라 환경 변수로 넘겨 argv·로그에 남지 않게 합니다. */
const buildAuthEnv = (token) =>
	token
		? {
				GIT_CONFIG_COUNT: "1",
				GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
				GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
			}
		: {};

const redact = (message, token) =>
	token ? message.split(token).join("***") : message;

const GIT_IDENTITY = [
	"-c",
	"user.name=github-actions[bot]",
	"-c",
	"user.email=41898282+github-actions[bot]@users.noreply.github.com",
	"-c",
	"commit.gpgsign=false",
	"-c",
	"core.hooksPath=/dev/null",
];

/**
 * deploy-log를 임시 클론에서 갱신해 push합니다. non-fast-forward면 원격을 다시 받아
 * 직전 SHA부터 다시 계산해 재시도합니다(최대 3회). 파일이 단일 타깃의 맨 위 삽입이라
 * rebase는 같은 줄에서 항상 충돌하므로, 다시 받아 처음부터 쓰는 쪽이 안전합니다.
 *
 * @returns {{ ok: true, range: object, version: string } | { ok: false, error: string, range?: object }}
 */
const writeAndPush = ({
	target,
	ref,
	cwd,
	remoteUrl,
	token,
	now,
	collect,
	maxAttempts,
}) => {
	const workDir = mkdtempSync(join(tmpdir(), "deploy-log-"));
	const authEnv = buildAuthEnv(token);
	const run = (args) => gitIn(workDir, args, authEnv);
	const filePath = join(workDir, `${target}.md`);
	let lastRange = null;
	let lastPrevious;
	let lastError = "";

	try {
		run(["init", "-q", "-b", DEPLOY_LOG_BRANCH]);
		run(["remote", "add", "origin", remoteUrl]);

		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			try {
				// ls-remote --exit-code: 2는 "브랜치 없음"(첫 기록), 그 외 실패는 진짜 오류입니다.
				let remoteExists = true;
				try {
					run([
						"ls-remote",
						"--exit-code",
						"--heads",
						"origin",
						DEPLOY_LOG_BRANCH,
					]);
				} catch (error) {
					if (error.status !== 2) {
						throw error;
					}
					remoteExists = false;
				}

				if (remoteExists) {
					run([
						"fetch",
						"-q",
						"--no-tags",
						"origin",
						`+refs/heads/${DEPLOY_LOG_BRANCH}:refs/remotes/origin/${DEPLOY_LOG_BRANCH}`,
					]);
					run([
						"checkout",
						"-q",
						"-B",
						DEPLOY_LOG_BRANCH,
						`origin/${DEPLOY_LOG_BRANCH}`,
					]);
				}

				const content = existsSync(filePath)
					? readFileSync(filePath, "utf8")
					: "";
				const previousSha = parseLatestRefSha(content);

				// 재시도에서 직전 SHA가 그대로면 PR 판정(turbo)을 다시 돌리지 않습니다.
				if (!lastRange || previousSha !== lastPrevious) {
					lastRange = collect({ previousSha, ref, target, cwd });
					lastPrevious = previousSha;
				}

				const version = resolveVersion({
					target,
					refSha: lastRange.refSha,
					cwd,
				});
				const entry = buildEntry({
					version,
					deployedAt: now,
					refSha: lastRange.refSha,
					kind: lastRange.kind,
					prs: lastRange.prs,
				});

				writeFileSync(filePath, insertEntry({ content, entry, target }));
				run(["add", `${target}.md`]);
				run([
					...GIT_IDENTITY,
					"commit",
					"-q",
					"-m",
					`chore: ${target} 배포 기록 ${version} (${lastRange.refSha.slice(0, 7)})`,
				]);
				run(["push", "-q", "origin", `HEAD:refs/heads/${DEPLOY_LOG_BRANCH}`]);

				return { ok: true, range: lastRange, version };
			} catch (error) {
				lastError = redact(
					`${error.message}${error.stderr ? `\n${error.stderr}` : ""}`,
					token,
				)
					.trim()
					.slice(0, 500);
				console.warn(
					`::warning::deploy-log 기록 ${attempt}/${maxAttempts}회차 실패: ${lastError}`,
				);

				// 로컬 커밋을 버리고 다음 회차에서 원격 기준으로 다시 씁니다.
				try {
					run(["reset", "-q", "--hard", `origin/${DEPLOY_LOG_BRANCH}`]);
				} catch {
					// 원격 브랜치가 아직 없으면 reset 대상이 없습니다. 작업 트리만 비웁니다.
					rmSync(filePath, { force: true });
					try {
						run([
							"rm",
							"-q",
							"--cached",
							"-f",
							"--ignore-unmatch",
							`${target}.md`,
						]);
						run(["update-ref", "-d", `refs/heads/${DEPLOY_LOG_BRANCH}`]);
					} catch {
						// 커밋이 없던 회차면 지울 ref도 없습니다.
					}
				}
			}
		}

		return { ok: false, error: lastError, range: lastRange ?? undefined };
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
};

/**
 * 기록하고 결과 객체를 돌려줍니다. 실패해도 던지지 않습니다.
 *
 * @returns {object} { ok, target, kind, prs, refSha, version, recordUrl, error?, warnings }
 */
export const recordDeploy = ({
	target,
	ref = "HEAD",
	repository,
	serverUrl = "https://github.com",
	cwd = process.cwd(),
	remoteUrl,
	token,
	now = new Date(),
	collect = collectDeployPrs,
	maxAttempts = MAX_PUSH_ATTEMPTS,
}) => {
	const recordUrl = `${serverUrl}/${repository}/blob/${DEPLOY_LOG_BRANCH}/${target}.md`;
	const base = { target, recordUrl, repository, serverUrl };

	try {
		if (!TARGETS.includes(target)) {
			throw new Error(`알 수 없는 릴리스 타깃입니다: ${target}`);
		}

		const resolvedRemote =
			remoteUrl ??
			(token
				? `${serverUrl}/${repository}.git`
				: gitIn(cwd, ["remote", "get-url", "origin"]));
		const outcome = writeAndPush({
			target,
			ref,
			cwd,
			remoteUrl: resolvedRemote,
			token,
			now,
			collect,
			maxAttempts,
		});
		const range = outcome.range;
		const prs = (range?.prs ?? []).map((pr) => ({
			number: pr.number,
			title: pr.title,
			url: `${serverUrl}/${repository}/pull/${pr.number}`,
		}));

		return {
			...base,
			ok: outcome.ok,
			kind: range?.kind,
			refSha: range?.refSha,
			version: outcome.version,
			prs,
			warnings: range?.warnings ?? [],
			...(outcome.ok ? {} : { error: outcome.error }),
		};
	} catch (error) {
		return {
			...base,
			ok: false,
			prs: [],
			warnings: [],
			error: redact(error.message, token).slice(0, 500),
		};
	}
};

const main = () => {
	const resultPath =
		process.env.DEPLOY_RECORD_PATH ||
		join(process.env.RUNNER_TEMP || tmpdir(), "deploy-record.json");

	const result = recordDeploy({
		target: process.env.TARGET ?? "",
		ref: process.env.DEPLOY_REF || "HEAD",
		repository: process.env.GITHUB_REPOSITORY ?? "",
		serverUrl: process.env.GITHUB_SERVER_URL || undefined,
		token: process.env.DEPLOY_LOG_TOKEN || undefined,
	});

	mkdirSync(dirname(resultPath), { recursive: true });
	writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
	console.log(JSON.stringify(result, null, 2));

	if (!result.ok) {
		console.warn(`::warning::배포 기록 실패: ${result.error}`);
	}

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`record-ok=${result.ok}\nrecord-kind=${result.kind ?? ""}\nrecord-path=${resultPath}\n`,
		);
	}
};

// 테스트가 import해도 실행되지 않게, 직접 실행했을 때만 돌립니다.
// 결과 파일을 쓰지 못하는 경우까지 포함해 어떤 실패도 exit 0으로 끝내, 알림 단계를 막지 않습니다.
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		main();
	} catch (error) {
		console.warn(`::warning::배포 기록 스크립트 오류: ${error.message}`);
	}
}
