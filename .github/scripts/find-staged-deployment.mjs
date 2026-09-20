#!/usr/bin/env node
/**
 * 이 커밋의 미승격 상용 배포가 있는지 찾아 GITHUB_OUTPUT에 씁니다.
 * .github/workflows/cd-web.yml 의 production 경로가 `vercel pull` 직후에 호출합니다.
 *
 * 있으면 릴리스는 재빌드 없이 그 배포를 승격하고, 없으면 지금처럼 빌드해서 배포합니다.
 * 조회에 실패해도 배포를 막지 않습니다. 못 찾은 것으로 취급하고 경고만 남긴 뒤 exit 0입니다.
 *
 * 출력: found(true/false), url, id
 *
 * 로컬에서는 `vercel pull` 뒤에 돌릴 수 있습니다(GITHUB_OUTPUT이 없으면 stdout에 찍습니다).
 *
 *   VERCEL_TOKEN=… SHA=$(git rev-parse HEAD) node .github/scripts/find-staged-deployment.mjs
 */

import { appendFileSync, readFileSync } from "node:fs";

import { toSingleLine } from "./lib/slack-api.mjs";
import {
	fetchProductionDeployments,
	pickStagedDeployment,
} from "./lib/staged-deployment.mjs";

/** 출력을 잡 output으로 기록합니다. 로컬 실행(GITHUB_OUTPUT 없음)에서는 stdout에 찍습니다. */
const writeOutputs = (outputs) => {
	const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);

	if (!process.env.GITHUB_OUTPUT) {
		console.log(lines.join("\n"));

		return;
	}

	appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
};

const main = async () => {
	const sha = process.env.SHA ?? "";
	const token = process.env.VERCEL_TOKEN ?? "";

	if (!sha || !token) {
		console.warn("::warning::SHA 또는 VERCEL_TOKEN 이 없어 미승격 배포를 찾지 않습니다");
		writeOutputs({ found: "false" });

		return;
	}

	// vercel pull 이 프로젝트를 링크하면서 남기는 파일입니다.
	const { projectId, orgId } = JSON.parse(
		readFileSync(".vercel/project.json", "utf8"),
	);

	const deployments = await fetchProductionDeployments({
		projectId,
		teamId: orgId,
		token,
		// 테스트가 가짜 서버로 돌릴 수 있게 열어 둡니다. 비우면 기본 주소를 씁니다.
		apiUrl: process.env.VERCEL_API_URL || undefined,
	});
	const staged = pickStagedDeployment({ deployments, sha });

	if (!staged) {
		console.log(`${sha.slice(0, 7)}의 미승격 배포가 없어 새로 빌드합니다`);
		writeOutputs({ found: "false" });

		return;
	}

	console.log(`${sha.slice(0, 7)}의 미승격 배포를 찾았습니다: ${staged.url}`);
	writeOutputs({ found: "true", url: staged.url, id: staged.id });
};

try {
	await main();
} catch (error) {
	console.warn(
		`::warning::미승격 배포를 찾지 못해 새로 빌드합니다: ${toSingleLine(error instanceof Error ? error.message : error)}`,
	);

	try {
		writeOutputs({ found: "false" });
	} catch {
		// output 기록마저 실패하면 뒤 스텝의 조건이 빈 값이 되어 재빌드로 내려갑니다.
	}
}
