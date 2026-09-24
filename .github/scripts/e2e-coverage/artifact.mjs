import { constants, copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/** 실행 전후 테스트의 바이트 동일성을 확인하기 위한 SHA-256입니다. */
export const testHash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** 이전 import 단계의 Actions 출력과 현재 파일을 대조합니다. */
export const validateTestHash = (file, expectedHash) => {
	if (!/^[a-f0-9]{64}$/.test(expectedHash ?? "") || testHash(file) !== expectedHash) {
		throw Object.assign(new Error("검증 전에 가져온 테스트와 현재 파일의 SHA-256이 다릅니다"), { isSafe: true });
	}
};

const assertRegular = (file, maxBytes = 64000) => {
	const stat = lstatSync(file);
	if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.size > maxBytes) {
		throw Object.assign(new Error("아티팩트가 일반 파일이 아니거나 크기 제한을 초과했습니다"), { isSafe: true });
	}
};

/** 게시용 입력은 고정 이름의 세 파일로 한정하고 기존 파일을 덮어쓰지 않습니다. */
export const exportArtifact = ({ directory, candidate, baseSha, includeReport = false }) => {
	const target = path.join(directory, "publish-artifact");
	mkdirSync(target);
	copyFileSync(path.join(directory, "candidate.json"), path.join(target, "candidate.json"), constants.COPYFILE_EXCL);
	writeFileSync(path.join(target, "base.json"), JSON.stringify({ baseSha }), { flag: "wx" });
	copyFileSync(candidate.testFile, path.join(target, "test.ts"), constants.COPYFILE_EXCL);

	if (includeReport) {
		copyFileSync(path.join(directory, "playwright.json"), path.join(target, "playwright.json"), constants.COPYFILE_EXCL);
	}

	return target;
};

/** 외부 아티팩트의 링크·추가 파일·기준 커밋 변조를 검사합니다. */
export const readArtifact = ({ artifactDirectory, repositoryRoot, baseSha, requireReport = false, expectedTestHash, expectedCandidateHash, expectedReportHash }) => {
	if (!artifactDirectory || !path.isAbsolute(artifactDirectory) || realpathSync(artifactDirectory) !== artifactDirectory || artifactDirectory === repositoryRoot || artifactDirectory.startsWith(`${repositoryRoot}${path.sep}`)) {
		throw Object.assign(new Error("아티팩트는 저장소 밖의 링크가 아닌 디렉터리여야 합니다"), { isSafe: true });
	}
	const names = ["base.json", "candidate.json", "test.ts"];
	if (requireReport) {
		names.push("playwright.json");
	}
	if (readdirSync(artifactDirectory).sort().join() !== names.sort().join()) {
		throw Object.assign(new Error("게시 아티팩트는 지정된 파일만 포함해야 합니다"), { isSafe: true });
	}
	for (const name of names) {
		assertRegular(path.join(artifactDirectory, name), name === "playwright.json" ? 2 * 1024 * 1024 : 64000);
	}
	if (requireReport) {
		validateTestHash(path.join(artifactDirectory, "test.ts"), expectedTestHash);
		validateTestHash(path.join(artifactDirectory, "candidate.json"), expectedCandidateHash);
		validateTestHash(path.join(artifactDirectory, "playwright.json"), expectedReportHash);
	}
	const metadata = JSON.parse(readFileSync(path.join(artifactDirectory, "base.json"), "utf8"));
	if (metadata.baseSha !== baseSha || Object.keys(metadata).join() !== "baseSha") {
		throw Object.assign(new Error("분석 이후 master가 변경되어 다시 분석해야 합니다"), { isSafe: true });
	}

	return JSON.parse(readFileSync(path.join(artifactDirectory, "candidate.json"), "utf8"));
};

/** 스키마 검사를 마친 목적지에 새 테스트를 복사하며 경로의 링크와 덮어쓰기를 차단합니다. */
export const copyArtifactTest = ({ artifactDirectory, candidate, repositoryRoot }) => {
	const target = path.resolve(repositoryRoot, candidate.testFile);
	if (!target.startsWith(`${repositoryRoot}${path.sep}`)) {
		throw Object.assign(new Error("테스트 경로가 저장소 밖을 가리킵니다"), { isSafe: true });
	}
	const parent = path.dirname(target);
	if (realpathSync(parent) !== parent) {
		throw Object.assign(new Error("테스트 폴더에 심볼릭 링크를 사용할 수 없습니다"), { isSafe: true });
	}
	copyFileSync(path.join(artifactDirectory, "test.ts"), target, constants.COPYFILE_EXCL);
};
