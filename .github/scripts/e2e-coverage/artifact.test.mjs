import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { copyArtifactTest, readArtifact, testHash, validateTestHash } from "./artifact.mjs";

test("게시 입력은 기준 SHA와 고정 파일 목록을 요구하고 링크·덮어쓰기를 거부한다", () => {
	const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), "e2e-artifact-")));
	const artifactDirectory = path.join(directory, "artifact");
	const repositoryRoot = path.join(directory, "repository");
	const candidate = { testFile: "e2e/tests/mocked/new.test.ts" };
	const baseSha = "a".repeat(40);
	try {
		mkdirSync(artifactDirectory);
		mkdirSync(path.join(repositoryRoot, "e2e/tests/mocked"), { recursive: true });
		writeFileSync(path.join(artifactDirectory, "candidate.json"), JSON.stringify(candidate));
		writeFileSync(path.join(artifactDirectory, "base.json"), JSON.stringify({ baseSha }));
		writeFileSync(path.join(artifactDirectory, "test.ts"), "test source");
		const options = { artifactDirectory, repositoryRoot, baseSha };
		assert.deepEqual(readArtifact(options), candidate);
		const expectedTestHash = testHash(path.join(artifactDirectory, "test.ts"));
		const expectedCandidateHash = testHash(path.join(artifactDirectory, "candidate.json"));
		writeFileSync(path.join(artifactDirectory, "playwright.json"), " ".repeat(100000));
		const expectedReportHash = testHash(path.join(artifactDirectory, "playwright.json"));
		const verified = { ...options, requireReport: true, expectedTestHash, expectedCandidateHash, expectedReportHash };
		assert.deepEqual(readArtifact(verified), candidate);
		assert.throws(() => readArtifact({ ...verified, expectedReportHash: "b".repeat(64) }));
		assert.throws(() => readArtifact({ ...verified, expectedTestHash: undefined }));
		assert.throws(() => readArtifact({ ...verified, expectedCandidateHash: "b".repeat(64) }));
		writeFileSync(path.join(artifactDirectory, "test.ts"), "changed after verify");
		assert.throws(() => readArtifact(verified));
		writeFileSync(path.join(artifactDirectory, "test.ts"), "test source");
		writeFileSync(path.join(artifactDirectory, "candidate.json"), JSON.stringify({ ...candidate, reason: "changed" }));
		assert.throws(() => readArtifact(verified));
		writeFileSync(path.join(artifactDirectory, "candidate.json"), JSON.stringify(candidate));
		rmSync(path.join(artifactDirectory, "playwright.json"));
		assert.throws(() => readArtifact({ ...options, baseSha: "b".repeat(40) }));
		writeFileSync(path.join(artifactDirectory, "extra"), "extra");
		assert.throws(() => readArtifact(options));
		rmSync(path.join(artifactDirectory, "extra"));
		copyArtifactTest({ ...options, candidate });
		assert.equal(readFileSync(path.join(repositoryRoot, candidate.testFile), "utf8"), "test source");
		const importedHash = testHash(path.join(repositoryRoot, candidate.testFile));
		validateTestHash(path.join(repositoryRoot, candidate.testFile), importedHash);
		assert.throws(() => validateTestHash(path.join(repositoryRoot, candidate.testFile), undefined));
		writeFileSync(path.join(repositoryRoot, candidate.testFile), "modified after execution");
		assert.throws(() => validateTestHash(path.join(repositoryRoot, candidate.testFile), importedHash));
		assert.throws(() => copyArtifactTest({ ...options, candidate }));
		assert.throws(() => copyArtifactTest({ ...options, candidate: { testFile: "../escape.test.ts" } }));
		rmSync(path.join(artifactDirectory, "test.ts"));
		symlinkSync(path.join(artifactDirectory, "candidate.json"), path.join(artifactDirectory, "test.ts"));
		assert.throws(() => readArtifact(options));
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
