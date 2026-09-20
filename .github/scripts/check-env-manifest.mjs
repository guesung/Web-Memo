#!/usr/bin/env node
/**
 * 환경 변수 매니페스트(.github/env-manifest.yml)를 코드·워크플로·.env 파일과 대조합니다.
 * .github/workflows/env-manifest.yml 이 모든 PR에서 호출합니다.
 *
 * 토큰이 필요 없는 검사만 합니다. GitHub·Vercel·Supabase에 실제로 등록된 목록과의 대조는
 * 콘솔에서 바뀌는 일이라 PR과 무관하므로 audit-env-registry.mjs 가 스케줄로 맡습니다.
 *
 * 사용:
 *   node .github/scripts/check-env-manifest.mjs          # 검사. 어긋나면 exit 1
 *   node .github/scripts/check-env-manifest.mjs --write  # docs/environment-variables.md 의 생성 목록을 갱신
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
	checkConsumers,
	checkDotenvFiles,
	checkReferences,
	collectReferences,
	isScannedFile,
	parseManifest,
	renderDocs,
	validateManifest,
} from "./lib/env-manifest.mjs";

const MANIFEST_PATH = ".github/env-manifest.yml";
const DOCS_PATH = "docs/environment-variables.md";
const ENVPKG_FILES = [
	"packages/env/.env.development",
	"packages/env/.env.staging",
	"packages/env/.env.production",
];

const readText = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);

const listTrackedFiles = () =>
	execFileSync("git", ["ls-files", "-z"], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter((path) => path !== "");

const reportErrors = (errors) => {
	for (const error of errors) {
		console.error(`::error::${error}`);
	}

	console.error(
		`\n환경 변수 매니페스트 검사에 실패했습니다 (${errors.length}건).\n` +
			`값을 추가·삭제했다면 ${MANIFEST_PATH} 를 함께 고치세요.`,
	);
	process.exitCode = 1;
};

const main = async () => {
	const shouldWriteDocs = process.argv.includes("--write");
	const manifestText = readText(MANIFEST_PATH);

	if (manifestText === null) {
		reportErrors([`${MANIFEST_PATH} 파일이 없습니다`]);

		return;
	}

	let entries;

	try {
		entries = parseManifest(manifestText);
	} catch (error) {
		reportErrors([`${MANIFEST_PATH}: ${error.message}`]);

		return;
	}

	const docsText = readText(DOCS_PATH);

	if (docsText === null) {
		reportErrors([`${DOCS_PATH} 파일이 없습니다`]);

		return;
	}

	if (shouldWriteDocs) {
		writeFileSync(DOCS_PATH, renderDocs(docsText, entries));
		console.log(`${DOCS_PATH} 의 생성 목록을 갱신했습니다`);

		return;
	}

	const scannedFiles = listTrackedFiles()
		.filter((path) => isScannedFile(path))
		.map((path) => ({ path, content: readText(path) ?? "" }));

	const errors = [
		...validateManifest(entries),
		...checkReferences({
			entries,
			references: collectReferences(scannedFiles),
		}),
		...checkConsumers({ entries, readFile: readText }),
		...checkDotenvFiles({
			entries,
			envpkgFiles: Object.fromEntries(
				ENVPKG_FILES.map((path) => [path, readText(path) ?? ""]),
			),
		}),
	];

	if (renderDocs(docsText, entries) !== docsText) {
		errors.push(
			`${DOCS_PATH} 의 생성 목록이 매니페스트와 다릅니다. node .github/scripts/check-env-manifest.mjs --write 로 갱신하세요`,
		);
	}

	if (errors.length > 0) {
		reportErrors(errors);

		return;
	}

	console.log(`환경 변수 ${entries.length}개가 코드·워크플로·문서와 일치합니다`);
};

await main();
