#!/usr/bin/env node
/**
 * GitHub·Vercel·Supabase에 실제로 등록된 환경 변수 이름을 매니페스트(.github/env-manifest.yml)와
 * 대조하고, 다르면 Slack으로 알립니다. .github/workflows/audit-env-registry.yml 이 매일 호출합니다.
 *
 * 콘솔에서 시크릿을 지우거나 새로 만드는 일은 PR과 무관하게 일어나므로 PR CI(check-env-manifest.mjs)가
 * 못 잡습니다. 이 스크립트가 그 틈을 메웁니다. 이름만 비교하므로 같은 이름이 두 저장소에 있을 때
 * 값이 같은지는 확인하지 못합니다.
 *
 * 동작 모드(AUDIT_MODE)
 *   notify(기본)  차이가 있으면 SLACK_WEBHOOK_URL로 알립니다. 매일 스케줄과 수동 실행이 씁니다.
 *   check         Slack을 보내지 않고 로그·요약·주석으로 보여 주며, 등록이 빠진 것(missing)이 있으면
 *                 실패합니다. PR이 씁니다. 매니페스트에 없는 등록은 경고로만 남깁니다.
 *                 조회하지 못한 저장소(미조회)는 비교할 수 없으므로 실패로 치지 않고 경고합니다.
 *
 * 저장소마다 조회 토큰이 다릅니다. 토큰이 없거나 거절되면 그 저장소만 "미조회"로 남기고 나머지를
 * 계속 대조합니다.
 *   GH_AUDIT_TOKEN        저장소 Actions 시크릿 목록을 읽을 수 있는 토큰(GitHub App의 Secrets: read)
 *   VERCEL_TOKEN          프로젝트 환경변수를 읽을 수 있는 토큰
 *   SUPABASE_ACCESS_TOKEN Supabase Management API 토큰
 *
 * 로컬 실행 (SLACK_WEBHOOK_URL 없이 돌리면 결과를 stdout에 찍고, 차이가 있으면 exit 1):
 *   VERCEL_TOKEN=... node .github/scripts/env/audit-env-registry.mjs
 */

import { appendFileSync, readFileSync } from "node:fs";

import { parseManifest } from "./env-manifest.mjs";
import {
	compareRegistry,
	fetchGithubSecretNames,
	fetchSupabaseSecretNames,
	fetchVercelEnvNames,
	formatFindingLine,
	formatFindings,
	isBlockingFinding,
	STORE_LABELS,
	tryFetch,
} from "./env-registry.mjs";
import { postToSlack } from "../shared/slack-blocks.mjs";

const MANIFEST_PATH = ".github/env-manifest.yml";
// 아래 식별자는 비밀이 아닙니다. Supabase 프로젝트 ref는 클라이언트에 인라인되는 URL에 들어 있고,
// Vercel 프로젝트·팀 이름은 cd-web.yml의 alias 명령에도 그대로 적혀 있습니다.
const VERCEL_PROJECT = "web-memo";
const VERCEL_TEAM_SLUG = "gueit214s-projects";
const SUPABASE_PROJECT_REF = "czwtqukymcqoberdoltq";

const main = async () => {
	const entries = parseManifest(readFileSync(MANIFEST_PATH, "utf8"));
	const repository = process.env.GITHUB_REPOSITORY ?? "guesung/Web-Memo";
	const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
	const runId = process.env.GITHUB_RUN_ID;
	const runUrl = runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : null;

	const results = await Promise.all([
		tryFetch({
			store: "github",
			tokenName: "GH_AUDIT_TOKEN",
			token: process.env.GH_AUDIT_TOKEN,
			fetcher: () =>
				fetchGithubSecretNames({
					repository,
					token: process.env.GH_AUDIT_TOKEN,
				}),
		}),
		tryFetch({
			store: "vercel",
			tokenName: "VERCEL_TOKEN",
			token: process.env.VERCEL_TOKEN,
			fetcher: () =>
				fetchVercelEnvNames({
					project: VERCEL_PROJECT,
					teamSlug: VERCEL_TEAM_SLUG,
					token: process.env.VERCEL_TOKEN,
				}),
		}),
		tryFetch({
			store: "supabase",
			tokenName: "SUPABASE_ACCESS_TOKEN",
			token: process.env.SUPABASE_ACCESS_TOKEN,
			fetcher: () =>
				fetchSupabaseSecretNames({
					projectRef: SUPABASE_PROJECT_REF,
					token: process.env.SUPABASE_ACCESS_TOKEN,
				}),
		}),
	]);

	for (const result of results) {
		console.log(
			result.skipped
				? `${result.store}: 미조회 (${result.skipped})`
				: `${result.store}: ${result.names.size}개 조회`,
		);
	}

	const { findings, skipped } = compareRegistry({ entries, results });
	const message = formatFindings({ findings, skipped, runUrl });

	for (const { store, reason } of skipped) {
		console.log(
			`::warning title=환경 변수 등록 현황 (${STORE_LABELS[store]})::조회하지 못해 대조하지 않았습니다 (${reason})`,
		);
	}

	if (message === null) {
		console.log("조회한 저장소의 등록 현황이 매니페스트와 일치합니다");

		return;
	}

	console.log(message);

	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
	}

	if (process.env.AUDIT_MODE === "check") {
		for (const finding of findings) {
			const level = isBlockingFinding(finding) ? "error" : "warning";

			console.log(
				`::${level} title=환경 변수 등록 현황 (${STORE_LABELS[finding.store]})::${formatFindingLine(finding)}`,
			);
		}

		if (findings.some((finding) => isBlockingFinding(finding))) {
			process.exitCode = 1;
		}

		return;
	}

	// 알림이 곧 결과이므로 Slack에 보냈다면 런은 성공으로 둡니다. 실패로 두면 워크플로의
	// 실패 알림과 이 알림이 겹치고, 그 실패 알림은 스크립트가 깨진 것으로 읽힙니다.
	if (!process.env.SLACK_WEBHOOK_URL) {
		console.warn(
			"::warning::SLACK_WEBHOOK_URL 이 없어 Slack 전송을 건너뜁니다. 차이가 있어 런을 실패로 표시합니다",
		);
		process.exitCode = 1;

		return;
	}

	await postToSlack(process.env.SLACK_WEBHOOK_URL, { text: message });
};

await main();
