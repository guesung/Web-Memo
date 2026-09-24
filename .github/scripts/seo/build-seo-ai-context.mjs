#!/usr/bin/env node
/**
 * SEO·GSC 보고서와 최근 커밋으로 AI 리포트 입력(artifacts/seo/ai-context.json)을 만듭니다.
 * .github/workflows/report-seo.yml 이 claude-code-action 앞 단계로 호출합니다.
 *
 * 모델에게 Bash를 주지 않으므로 커밋 목록은 여기서 미리 뽑아 넘깁니다.
 * 주간 리포트면 7일, 일일 리포트면 24시간 범위를 봅니다.
 */

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createSeoAiContext, parseGitLog } from "./seo-ai-context.mjs";

const execFileAsync = promisify(execFile);

/** SEO에 영향을 주는 코드가 있는 경로입니다. 확장 코드는 검색 노출과 무관해 뺍니다. */
const SEO_SOURCE_PATHS = ["apps/web", "packages/ui", "packages/shared"];

const readOptionalJson = async (path) => {
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch {
		return null;
	}
};

/** 기간 안의 SEO 관련 커밋을 읽습니다. 얕은 체크아웃 등으로 실패하면 빈 목록으로 두고 경고만 남깁니다. */
export const readRecentCommits = async ({ hours, runGit = execFileAsync }) => {
	try {
		// 머지 커밋 방식이라 며칠 전 커밋이 오늘 master에 들어올 수 있습니다. master에 들어온 시점으로 보려고
		// 첫 부모만 따라가고, 머지 커밋의 파일 목록은 첫 부모 대비 변경으로 계산합니다.
		const { stdout } = await runGit("git", [
			"log",
			`--since=${hours} hours ago`,
			"--first-parent",
			"--diff-merges=first-parent",
			"--pretty=format:%h%x1f%cI%x1f%s",
			"--name-only",
			"--",
			...SEO_SOURCE_PATHS,
		]);

		return parseGitLog(stdout);
	} catch (error) {
		console.warn(
			`::warning::최근 커밋을 읽지 못해 커밋 없이 AI 입력을 만듭니다: ${error instanceof Error ? error.message.replace(/[\r\n]+/g, " ") : error}`,
		);

		return [];
	}
};

/** 보고서를 읽어 AI 입력 파일을 씁니다. SEO 보고서가 없으면 AI 리포트를 만들 근거가 없어 던집니다. */
export const buildSeoAiContext = async ({ now = new Date(), runGit } = {}) => {
	const seoReport = JSON.parse(await readFile("artifacts/seo/seo-report.json", "utf8"));
	const gscReport = await readOptionalJson("artifacts/seo/gsc-report.json");
	const commits = await readRecentCommits({
		hours: gscReport?.weekly ? 7 * 24 : 24,
		runGit,
	});
	const context = createSeoAiContext({ seoReport, gscReport, commits, now });
	await writeFile("artifacts/seo/ai-context.json", `${JSON.stringify(context, null, 2)}\n`);
	console.log(
		`AI 입력 생성: ${context.mode} · 이슈 묶음 ${context.seo.issueGroups.length}개 · 커밋 ${context.commits.length}개 · 근거 ${context.evidenceIds.length}개`,
	);

	return context;
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await buildSeoAiContext();
}
