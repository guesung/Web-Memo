#!/usr/bin/env node
/**
 * SEO AI 리포트의 P0·P1 발견을 Claude Code가 코드로 고치고 PR로 올리는 파이프라인의 결정적인 부분입니다.
 * .github/workflows/report-seo.yml 의 세 잡이 하위 명령으로 나눠 호출합니다.
 *
 *   select  (inspect 잡)  수정 대상을 고르고, 이미 열린 자동 수정 PR이 있으면 건너뜁니다.
 *   summarize (fix 잡)    Claude의 최종 답변을 Step Summary에 남깁니다.
 *   changes (fix 잡)      Claude가 바꾼 파일을 검사하고 패치로 내보냅니다.
 *   publish (publish 잡)  검증된 패치를 새 브랜치에 커밋해 master 대상 PR을 열고 Slack 스레드에 알립니다.
 *
 * Claude에게는 git 자격 증명도 Bash도 없습니다. 모델이 고칠 수 있는 범위(경로·파일 수·파일 모드)는
 * 모델 밖에서 여기서 강제합니다. 자동 머지는 하지 않습니다.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { postSlackMessage, readSlackEnv, toSingleLine } from "../shared/slack-api.mjs";

const BRANCH_PREFIX = "claude/seo-fix-";
const FIX_PRIORITIES = ["P0", "P1"];
const MAX_TARGETS = 3;
const MAX_CHANGED_FILES = 10;
/** 웹 사이트의 SEO 응답을 만드는 코드입니다. 워크플로·설정·의존성은 여기 없으므로 모델이 건드릴 수 없습니다. */
const ALLOWED_PREFIXES = ["apps/web/", "packages/ui/", "packages/shared/"];
const FORBIDDEN_BASENAMES = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];

const TARGETS_FILE = "artifacts/seo/fix-targets.json";

const stripLine = (ref) => ref.replace(/:\d+(?:-\d+)?$/, "");

const isAllowedPath = (filePath) =>
	ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix)) &&
	!filePath.split("/").includes("..") &&
	!filePath.split("/").includes("node_modules") &&
	!FORBIDDEN_BASENAMES.includes(path.posix.basename(filePath)) &&
	!path.posix.basename(filePath).startsWith(".env");

/**
 * AI 리포트에서 자동 수정 대상을 고릅니다.
 * @description P0·P1이면서 해결 방법이 코드 수정(fixability=code)이고 코드 위치가 수정 허용 경로 안에 있는 발견만 남깁니다. 위치가 허용 경로 밖이면 코드 위치에서 빼고, 남는 위치가 없으면 대상이 아닙니다.
 */
export const selectSeoFixTargets = ({ report }) =>
	(Array.isArray(report?.findings) ? report.findings : [])
		.filter((finding) => FIX_PRIORITIES.includes(finding?.priority) && finding?.fixability === "code")
		.map((finding) => ({
			priority: finding.priority,
			title: finding.title,
			impact: finding.impact,
			evidence: finding.evidence,
			suggestion: finding.suggestion,
			evidenceIds: finding.evidenceIds ?? [],
			codeRefs: (Array.isArray(finding.codeRefs) ? finding.codeRefs : []).filter((ref) =>
				isAllowedPath(stripLine(ref)),
			),
		}))
		.filter((target) => target.codeRefs.length > 0)
		.slice(0, MAX_TARGETS);

/**
 * claude-code-action이 남긴 실행 기록에서 Claude의 마지막 답변을 꺼냅니다.
 * @description 파일을 바꾸지 않은 이유를 사람이 볼 수 있게 하려는 것입니다. 답변이 없으면 빈 문자열입니다.
 */
export const extractFinalResult = ({ execution }) => {
	const entries = Array.isArray(execution) ? execution : [];
	const last = [...entries].reverse().find((entry) => entry?.type === "result");

	return typeof last?.result === "string" ? last.result.trim() : "";
};

/** 수정 허용 경로 밖이거나 의존성·환경 파일인 경로를 돌려줍니다. */
export const findDisallowedPaths = ({ paths }) => paths.filter((filePath) => !isAllowedPath(filePath));

/** 심볼릭 링크를 만들거나 실행 권한을 바꾸는 변경을 돌려줍니다. `git diff --summary` 출력을 받습니다. */
export const findUnsafeModeChanges = ({ summary }) =>
	summary.split("\n").filter((line) => /mode change|mode 120000|mode 100755/.test(line));

export const buildSeoFixBranchName = ({ date }) => `${BRANCH_PREFIX}${date.toISOString().slice(0, 10).replaceAll("-", "")}`;

/** 제목은 모델이 쓴 문장을 넣지 않고 건수만 씁니다. */
export const buildSeoFixPrTitle = ({ targets }) => {
	const counts = FIX_PRIORITIES.map((priority) => [priority, targets.filter((target) => target.priority === priority).length])
		.filter(([, count]) => count > 0)
		.map(([priority, count]) => `${priority} ${count}건`);

	return `fix: SEO 리포트 ${counts.join("·")} 자동 수정`;
};

/** 본문에 들어가는 모델 문장은 한 줄로 만들고 @멘션이 실제 알림이 되지 않게 합니다. */
const toBodyText = (value) => toSingleLine(value ?? "").replaceAll("@", "@​").trim();

export const buildSeoFixPrBody = ({ targets, runUrl }) =>
	[
		"## 설명",
		"",
		`SEO 모니터의 AI 리포트에서 P0·P1로 분류된 발견 ${targets.length}건을 근거로 Claude Code가 작성한 수정입니다.${runUrl ? ` (${runUrl})` : ""}`,
		"자동 머지는 하지 않습니다. 수정이 발견의 원인을 실제로 고치는지 diff를 확인한 뒤 머지합니다.",
		"",
		"### 대상 발견",
		"",
		...targets.map(
			(target) =>
				`- **${target.priority} · ${toBodyText(target.title)}** — ${toBodyText(target.evidence)} (근거: ${target.evidenceIds.map(toBodyText).join(", ")}) · 코드: ${target.codeRefs.map((ref) => `\`${toBodyText(ref)}\``).join(" ")}`,
		),
		"",
		"## 관련 이슈",
		"",
		"- 생성 워크플로: `.github/workflows/report-seo.yml`",
		"",
		"## 변경 유형",
		"",
		"- [x] 버그 수정",
		"",
		"## 체크리스트",
		"",
		"- [x] 워크플로에서 `pnpm check`·`pnpm type-check` 통과",
		"- [ ] 사람이 diff를 확인했다",
		"",
	].join("\n");

const run = (command, args, options = {}) =>
	execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();

const output = (key, value) => {
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
	}
};

const fixDirectory = () => {
	const directory = path.resolve(process.env.SEO_FIX_DIR ?? path.join(process.env.RUNNER_TEMP ?? "/tmp", "seo-fix"));
	mkdirSync(directory, { recursive: true });

	return directory;
};

const listStagedPaths = () => run("git", ["diff", "--cached", "--name-only", "-z"]).split("\0").filter(Boolean);

/** 스테이징된 변경이 허용 범위 안인지 검사합니다. 벗어나면 던져 잡을 실패시킵니다. */
const assertStagedChangesAllowed = () => {
	const paths = listStagedPaths();
	const disallowed = findDisallowedPaths({ paths });
	if (disallowed.length > 0) {
		throw new Error(`수정 허용 범위를 벗어난 파일이 있습니다: ${disallowed.join(", ")}`);
	}
	if (paths.length > MAX_CHANGED_FILES) {
		throw new Error(`변경 파일이 ${MAX_CHANGED_FILES}개를 넘습니다(${paths.length}개)`);
	}
	const unsafeModes = findUnsafeModeChanges({ summary: run("git", ["diff", "--cached", "--summary"]) });
	if (unsafeModes.length > 0) {
		throw new Error(`심볼릭 링크·실행 권한 변경은 허용하지 않습니다: ${unsafeModes.join(" / ")}`);
	}

	return paths;
};

const listOpenFixBranches = () =>
	run("gh", ["pr", "list", "--state", "open", "--base", "master", "--limit", "100", "--json", "headRefName", "--jq", ".[].headRefName"])
		.split("\n")
		.filter((branch) => branch.startsWith(BRANCH_PREFIX));

const commands = {
	summarize: () => {
		const executionFile = process.env.EXECUTION_FILE;
		let result = "";
		try {
			result = executionFile ? extractFinalResult({ execution: JSON.parse(readFileSync(executionFile, "utf8")) }) : "";
		} catch (error) {
			console.warn(`::warning::Claude 실행 기록을 읽지 못했습니다: ${toSingleLine(error.message)}`);
		}
		// 코드 펜스를 닫아 버리는 문자열이 섞여도 Step Summary 마크다운이 깨지지 않게 합니다.
		const text = result ? result.slice(0, 4000).replaceAll("```", "'") : "(최종 답변 없음)";
		const summary = ["### SEO 자동 수정 — Claude 최종 답변", "", "```text", text, "```", ""].join("\n");
		if (process.env.GITHUB_STEP_SUMMARY) {
			appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
		}
		console.log(summary);
	},

	select: () => {
		const reportPath = "artifacts/seo/ai-report.json";
		if (!existsSync(reportPath)) {
			console.log("AI 리포트가 없어 SEO 자동 수정을 건너뜁니다");
			output("has_targets", "false");

			return;
		}
		const report = JSON.parse(readFileSync(reportPath, "utf8")).report;
		const targets = selectSeoFixTargets({ report });
		const candidateCount = (report?.findings ?? []).filter((finding) => FIX_PRIORITIES.includes(finding?.priority)).length;
		console.log(`P0·P1 발견 ${candidateCount}건 중 코드 수정 대상 ${targets.length}건`);
		if (targets.length === 0) {
			console.log("수정 대상 발견(P0·P1, 해결 방법이 코드 수정, 허용 경로 안의 코드 위치)이 없습니다");
			output("has_targets", "false");

			return;
		}
		let openBranches;
		try {
			openBranches = listOpenFixBranches();
		} catch (error) {
			// 중복 PR 여부를 모르면 만들지 않는 쪽이 싸고 안전합니다.
			console.warn(`::warning::열린 자동 수정 PR을 조회하지 못해 건너뜁니다: ${toSingleLine(error.message)}`);
			output("has_targets", "false");

			return;
		}
		if (openBranches.length > 0) {
			console.log(`열린 자동 수정 PR(${openBranches.join(", ")})이 있어 건너뜁니다`);
			output("has_targets", "false");

			return;
		}
		writeFileSync(TARGETS_FILE, `${JSON.stringify(targets, null, 2)}\n`);
		console.log(`SEO 자동 수정 대상: ${targets.length}건`);
		output("has_targets", "true");
	},

	changes: () => {
		run("git", ["add", "--all"]);
		if (listStagedPaths().length === 0) {
			console.log("Claude가 바꾼 파일이 없어 PR을 만들지 않습니다");
			output("ready", "false");

			return;
		}
		const paths = assertStagedChangesAllowed();
		writeFileSync(path.join(fixDirectory(), "seo-fix.patch"), run("git", ["diff", "--cached", "--binary"], { maxBuffer: 50 * 1024 * 1024 }) + "\n");
		console.log(`변경 파일 ${paths.length}개: ${paths.join(", ")}`);
		output("ready", "true");
	},

	publish: async () => {
		const directory = fixDirectory();
		const targets = JSON.parse(readFileSync(path.join(directory, "targets", "fix-targets.json"), "utf8"));
		const patchPath = path.join(directory, "patch", "seo-fix.patch");
		run("git", ["apply", "--index", "--check", patchPath]);
		run("git", ["apply", "--index", patchPath]);
		// fix 잡이 이미 검사했지만 패치는 잡 사이를 건너온 입력이라 발행 직전에 다시 검사합니다.
		assertStagedChangesAllowed();

		const branch = buildSeoFixBranchName({ date: new Date() });
		const title = buildSeoFixPrTitle({ targets });
		const bodyPath = path.join(directory, "pr-body.md");
		const runUrl = process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
			? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
			: "";
		writeFileSync(bodyPath, buildSeoFixPrBody({ targets, runUrl }));

		run("git", ["config", "user.name", process.env.GIT_USER_NAME ?? "github-actions[bot]"]);
		run("git", ["config", "user.email", process.env.GIT_USER_EMAIL ?? "41898282+github-actions[bot]@users.noreply.github.com"]);
		run("git", ["switch", "--create", branch]);
		run("git", ["commit", "--quiet", "--message", title]);
		// 강제 push를 하지 않습니다. 같은 날 브랜치가 이미 있으면 push가 실패해 중복 PR이 생기지 않습니다.
		run("git", ["push", "--quiet", "origin", branch]);
		const prUrl = run("gh", ["pr", "create", "--base", "master", "--head", branch, "--title", title, "--body-file", bodyPath]);
		console.log(`SEO 자동 수정 PR: ${prUrl}`);

		const slack = readSlackEnv();
		if (slack.botToken && slack.channelId && slack.threadTs) {
			const reply = await postSlackMessage({
				token: slack.botToken,
				channel: slack.channelId,
				threadTs: slack.threadTs,
				payload: {
					text: "SEO 자동 수정 PR을 열었습니다",
					blocks: [
						{
							type: "section",
							text: { type: "mrkdwn", text: `🛠 P0·P1 발견을 Claude Code가 수정한 PR을 열었습니다. 머지 전에 diff를 확인해 주세요.\n<${prUrl}|${toSingleLine(title).replace(/[&<>]/g, "")}>`, verbatim: true },
						},
					],
				},
			});
			if (!reply.ok) {
				console.warn(`::warning::Slack 스레드에 PR 링크를 달지 못했습니다(${reply.error})`);
			}
		}
	},
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const command = commands[process.argv[2]];
	if (!command) {
		console.error(`알 수 없는 명령: ${process.argv[2]} (select | summarize | changes | publish)`);
		process.exit(1);
	}
	try {
		await command();
	} catch (error) {
		console.error(`::error::${toSingleLine(error instanceof Error ? error.message : error)}`);
		process.exit(1);
	}
}
