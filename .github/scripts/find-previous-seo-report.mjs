#!/usr/bin/env node

import { execFile } from "node:child_process";
import { appendFile, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** GitHub Actions 아티팩트 목록에서 사용할 이전 SEO 보고서를 고릅니다. */
export const selectPreviousSeoArtifact = ({ artifacts, runId }) =>
	artifacts
		.filter(
			(artifact) =>
				artifact.name?.startsWith("seo-report-") &&
				artifact.expired === false &&
				String(artifact.workflow_run?.id ?? "") !== String(runId) &&
				artifact.workflow_run?.head_branch === "master",
		)
		.sort(
			(first, second) =>
				Date.parse(second.created_at ?? "") - Date.parse(first.created_at ?? ""),
		)[0] ?? null;

/** GitHub REST API에서 저장소의 유효한 Actions 아티팩트를 모두 조회합니다. */
export const fetchSeoArtifacts = async ({
	repository,
	token,
	fetcher = fetch,
	apiUrl = "https://api.github.com",
}) => {
	if (!/^[^/]+\/[^/]+$/.test(repository)) {
		throw new Error("GITHUB_REPOSITORY 형식이 올바르지 않음");
	}
	const artifacts = [];
	for (let page = 1; ; page += 1) {
		const url = new URL(
			`${apiUrl.replace(/\/$/, "")}/repos/${repository}/actions/artifacts`,
		);
		url.searchParams.set("per_page", "100");
		url.searchParams.set("page", String(page));
		const response = await fetcher(url, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${token}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});
		if (!response.ok) {
			throw new Error(`GitHub 아티팩트 조회 실패: HTTP ${response.status}`);
		}
		let payload;
		try {
			payload = await response.json();
		} catch {
			throw new Error("GitHub 아티팩트 응답을 해석할 수 없음");
		}
		if (!Array.isArray(payload.artifacts)) {
			throw new Error("GitHub 아티팩트 응답 형식이 올바르지 않음");
		}
		artifacts.push(...payload.artifacts);
		if (payload.artifacts.length < 100) {
			break;
		}
	}

	return artifacts;
};

/** zip 아티팩트를 임시 디렉터리에 해제합니다. */
export const extractZip = async ({ archivePath, destination }) => {
	await execFileAsync("unzip", ["-qq", "-o", archivePath, "-d", destination]);
};

/** 해제된 아티팩트 안에서 SEO JSON 보고서를 찾습니다. */
export const findSeoReportFile = async (directory) => {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			const nested = await findSeoReportFile(path);
			if (nested) {
				return nested;
			}
		} else if (entry.name === "seo-report.json") {
			return resolve(path);
		}
	}

	return null;
};

/** 선택한 GitHub 아티팩트를 다운로드해 SEO 보고서 경로를 돌려줍니다. */
export const downloadSeoReport = async ({
	artifact,
	token,
	fetcher = fetch,
	extractor = extractZip,
	createTempDirectory = () => mkdtemp(join(tmpdir(), "web-memo-seo-history-")),
}) => {
	const response = await fetcher(artifact.archive_download_url, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
		},
		redirect: "follow",
	});
	if (!response.ok) {
		throw new Error(`GitHub 아티팩트 다운로드 실패: HTTP ${response.status}`);
	}
	const directory = await createTempDirectory();
	const archivePath = join(directory, "seo-report.zip");
	const destination = join(directory, "extracted");
	await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
	await extractor({ archivePath, destination });
	const reportPath = await findSeoReportFile(destination);
	if (!reportPath) {
		throw new Error("SEO 아티팩트에 seo-report.json이 없음");
	}

	return reportPath;
};

/** 이전 기본 브랜치 SEO 보고서를 찾아 로컬 경로로 준비합니다. */
export const findPreviousSeoReport = async ({
	repository,
	token,
	runId,
	fetcher = fetch,
	apiUrl,
	extractor,
	createTempDirectory,
}) => {
	const artifacts = await fetchSeoArtifacts({
		repository,
		token,
		fetcher,
		apiUrl,
	});
	const artifact = selectPreviousSeoArtifact({ artifacts, runId });
	if (!artifact) {
		return null;
	}

	return downloadSeoReport({
		artifact,
		token,
		fetcher,
		extractor,
		createTempDirectory,
	});
};

/** 검색 결과를 GitHub Actions step output에 기록합니다. */
export const writeOutputs = async (outputs, outputPath = process.env.GITHUB_OUTPUT) => {
	const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
	if (!outputPath) {
		console.log(lines.join("\n"));

		return;
	}
	await appendFile(outputPath, `${lines.join("\n")}\n`);
};

/** Actions 환경변수로 이전 SEO 보고서를 찾고 실패를 안전하게 다룹니다. */
export const main = async () => {
	const repository = process.env.GITHUB_REPOSITORY ?? "";
	const token = process.env.GITHUB_TOKEN ?? "";
	const runId = process.env.GITHUB_RUN_ID ?? "";
	if (!repository || !token || !runId) {
		console.warn("::warning::GitHub Actions 환경변수가 없어 이전 SEO 보고서를 조회하지 않습니다");
		await writeOutputs({ found: "false", baseline_status: "failed" });

		return;
	}
	try {
		const reportPath = await findPreviousSeoReport({
			repository,
			token,
			runId,
			apiUrl: process.env.GITHUB_API_URL,
		});
		if (!reportPath) {
			console.log("master 브랜치의 이전 SEO 보고서 아티팩트가 없습니다");
			await writeOutputs({ found: "false", baseline_status: "missing" });

			return;
		}
		await writeOutputs({
			found: "true",
			baseline_status: "available",
			SEO_PREVIOUS_REPORT: reportPath,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "알 수 없는 오류";
		console.warn(`::warning::이전 SEO 보고서를 사용하지 못합니다: ${message.replace(/[\r\n]+/g, " ")}`);
		await writeOutputs({ found: "false", baseline_status: "failed" });
	}
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await main();
}
