#!/usr/bin/env node
/**
 * 확장·앱·릴리스노트 세 버전 트랙의 현재 버전과 마지막 변경일을 모아
 * apps/web/src/constants/versionStatus.json으로 저장한다.
 *
 * 버전은 Slack "다른 버전…" 버튼이든 수동 커밋이든 결국 각 트랙 파일에 대한
 * 커밋으로 남으므로, 그 파일의 마지막 커밋 날짜를 "언제 바뀌었는지"로 쓴다.
 * git 정보를 못 읽으면(얕은 클론 등) 날짜를 null로 남기고 빌드를 막지 않는다.
 *
 * apps/web의 dev·build·preview 스크립트가 매번 이 스크립트를 먼저 돌린다.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const outputPath = path.join(
	repoRoot,
	"apps/web/src/constants/versionStatus.json",
);

const readJson = (relPath) =>
	JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf-8"));

/** "YYYY-MM-DD"로만 남긴다 — 화면에서 별도 Date 파싱 없이 그대로 쓴다. */
const lastCommitDate = (relPath) => {
	try {
		const out = execSync(`git log -1 --format=%aI -- "${relPath}"`, {
			cwd: repoRoot,
			stdio: ["ignore", "pipe", "ignore"],
		})
			.toString()
			.trim();

		return out ? out.slice(0, 10) : null;
	} catch {
		return null;
	}
};

const readLatestReleaseNote = () => {
	const source = readFileSync(
		path.join(repoRoot, "apps/web/src/constants/Update.ts"),
		"utf-8",
	);
	const match = source.match(/date:\s*"([^"]+)"[\s\S]*?version:\s*"([^"]+)"/);

	if (!match) {
		return { version: null, date: null };
	}

	const [, date, version] = match;

	// "2026.08.09" → "2026-08-09" 형식과 맞춘다.
	return { version, date: date.replaceAll(".", "-") };
};

const extensionPkg = readJson("apps/chrome-extension/package.json");
const appJson = readJson("apps/app/app.json");
const latestReleaseNote = readLatestReleaseNote();

const versionStatus = {
	generatedAt: new Date().toISOString(),
	tracks: [
		{
			track: "extension",
			version: extensionPkg.version ?? null,
			lastChangedAt: lastCommitDate("apps/chrome-extension/package.json"),
		},
		{
			track: "app",
			version: appJson.expo?.version ?? null,
			lastChangedAt: lastCommitDate("apps/app/app.json"),
		},
		{
			track: "release-notes",
			version: latestReleaseNote.version,
			// 릴리스 노트 날짜는 Update.ts에 사람이 직접 적어둔 값이라 git log가 아니라
			// 그 값을 그대로 쓴다("2026.08.09" 형식, ISO가 아니라 그대로 문자열로 둔다).
			lastChangedAt: latestReleaseNote.date,
		},
	],
};

writeFileSync(outputPath, `${JSON.stringify(versionStatus, null, "\t")}\n`);

console.log("버전 현황 생성 완료:", outputPath);
