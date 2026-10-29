#!/usr/bin/env node
/**
 * chore-sentry-triage.yml 의 guard 잡. 분석을 시작할지 판정합니다.
 *
 * 건너뛰는 경우
 *   - 같은 이슈의 sentry-fix/<issue_id> PR 이 이미 열려 있다
 *   - 같은 이슈로 오늘(UTC) 성공한 이 워크플로 실행이 있다
 *   - 오늘(UTC) 생성된 이 워크플로 실행이 일일 상한 이상이다(현재 실행 제외)
 *
 * 워크플로 실행은 입력을 API 로 돌려주지 않아, 이슈 구분은 워크플로의 run-name
 * (`Sentry triage <short_id> [issue:<issue_id>]`)을 읽어 합니다.
 *
 * 결과는 GITHUB_OUTPUT 의 proceed / skip_reason / existing_pr_url 로 냅니다.
 * 입력이 올바르지 않으면 던져서 잡을 실패시킵니다(notify-failure 가 알립니다).
 */

import { appendFileSync } from "node:fs";
import { isMainModule, readRawInputs, validateInputs } from "./triage-inputs.mjs";

export const DEFAULT_DAILY_LIMIT = 3;
export const WORKFLOW_FILE = "chore-sentry-triage.yml";

export const branchFor = (issueId) => `sentry-fix/${issueId}`;

/** 상한 값이 비었거나 숫자가 아니면 기본값을 씁니다. 0 은 "전부 막기"로 존중합니다. */
export const parseDailyLimit = (raw) => {
	const text = String(raw ?? "").trim();
	if (!/^\d+$/.test(text)) return DEFAULT_DAILY_LIMIT;

	return Number(text);
};

export const readIssueIdFromRunName = (title) =>
	/\[issue:(\d+)\]$/.exec(title ?? "")?.[1] ?? null;

export const utcDateString = (date = new Date()) => date.toISOString().slice(0, 10);

/**
 * 순수 판정 함수.
 * @param {{ issueId: string, openPrUrl: string | null, runsToday: Array<{ id: number, conclusion: string | null, display_title?: string }>, currentRunId: number, dailyLimit: number }} params
 * @returns {{ proceed: true } | { proceed: false, reason: string, existingPrUrl?: string }}
 */
export const decideGuard = ({
	issueId,
	openPrUrl,
	runsToday,
	currentRunId,
	dailyLimit,
}) => {
	if (openPrUrl) {
		return {
			proceed: false,
			reason: `이 이슈의 수정 PR 이 이미 열려 있어 분석을 건너뜁니다: ${openPrUrl}`,
			existingPrUrl: openPrUrl,
		};
	}

	const others = runsToday.filter((run) => run.id !== currentRunId);

	const succeededForIssue = others.some(
		(run) =>
			run.conclusion === "success" &&
			readIssueIdFromRunName(run.display_title) === issueId,
	);
	if (succeededForIssue) {
		return {
			proceed: false,
			reason: "같은 이슈를 오늘 이미 분석해 건너뜁니다",
		};
	}

	if (others.length >= dailyLimit) {
		return {
			proceed: false,
			reason: `오늘 AI 분석 일일 상한(${dailyLimit}건)에 도달해 건너뜁니다`,
		};
	}

	return { proceed: true };
};

const githubGet = async (path, token) => {
	const response = await fetch(`https://api.github.com${path}`, {
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${token}`,
			"x-github-api-version": "2022-11-28",
		},
	});
	if (!response.ok) {
		throw new Error(`GitHub API 실패: ${path.split("?")[0]} -> ${response.status}`);
	}

	return await response.json();
};

const writeOutputs = (outputs) => {
	const lines = Object.entries(outputs).map(
		([key, value]) => `${key}=${String(value).replace(/[\r\n]+/g, " ")}`,
	);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
	}
	console.log(lines.join("\n"));
};

const main = async () => {
	const inputs = validateInputs(readRawInputs());
	if (!inputs.ok) {
		throw new Error(`입력 검증 실패: ${inputs.errors.join("; ")}`);
	}
	const { issueId } = inputs.value;

	const token = process.env.GH_TOKEN;
	const repository = process.env.GITHUB_REPOSITORY;
	const currentRunId = Number(process.env.GITHUB_RUN_ID);
	if (!token || !repository || !currentRunId) {
		throw new Error("GH_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID 가 필요합니다");
	}
	const owner = repository.split("/")[0];

	const pulls = await githubGet(
		`/repos/${repository}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branchFor(issueId)}`)}&per_page=5`,
		token,
	);
	const openPrUrl = pulls[0]?.html_url ?? null;

	const today = utcDateString();
	const runsResponse = await githubGet(
		`/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/runs?created=${encodeURIComponent(`>=${today}`)}&per_page=100`,
		token,
	);

	const decision = decideGuard({
		issueId,
		openPrUrl,
		runsToday: runsResponse.workflow_runs ?? [],
		currentRunId,
		dailyLimit: parseDailyLimit(process.env.SENTRY_TRIAGE_DAILY_LIMIT),
	});

	writeOutputs({
		proceed: decision.proceed,
		skip_reason: decision.proceed ? "" : decision.reason,
		existing_pr_url: decision.proceed ? "" : (decision.existingPrUrl ?? ""),
	});
};

if (isMainModule(import.meta.url)) {
	main().catch((error) => {
		console.error(`::error::${error instanceof Error ? error.message : error}`);
		process.exit(1);
	});
}
