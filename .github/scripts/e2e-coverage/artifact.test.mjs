import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MAX_CANDIDATE_BYTES, validateCandidate } from "./validation.mjs";
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


test("전체 흐름의 긴 한글 근거를 가져오되 후보 JSON 상한은 유지한다", () => {
	const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), "e2e-candidate-size-")));
	const artifactDirectory = path.join(directory, "artifact");
	const repositoryRoot = path.join(directory, "repository");
	const baseSha = "a".repeat(40);
	const assessment = { flowId: "flow-0", status: "gap", reason: "가".repeat(3000), productRefs: ["pages/panel.ts"], existingTestRefs: ["e2e/tests/web/existing.test.ts"] };
	const assessments = Array.from({ length: 10 }, (_, index) => ({ ...assessment, flowId: `flow-${index}` }));
	const candidate = { status: "gap", scenarioId: "flow-0", reason: "추가 검증 필요", productRefs: assessment.productRefs, existingTestRefs: assessment.existingTestRefs, missingAction: "저장", expectedResult: "메모 표시", testFile: "e2e/tests/web/new.test.ts", project: "web", assessments };
	const context = { flows: assessments.map((item) => ({ id: item.flowId })), projects: ["web"], trackedFiles: [...assessment.productRefs, ...assessment.existingTestRefs] };
	try {
		mkdirSync(artifactDirectory);
		const serialized = `${JSON.stringify(validateCandidate(candidate, context), null, 2)}\n`;
		assert.ok(Buffer.byteLength(serialized) > 64000);
		writeFileSync(path.join(artifactDirectory, "candidate.json"), serialized);
		writeFileSync(path.join(artifactDirectory, "base.json"), JSON.stringify({ baseSha }));
		writeFileSync(path.join(artifactDirectory, "test.ts"), "test source");
		assert.deepEqual(readArtifact({ artifactDirectory, repositoryRoot, baseSha }), candidate);
		writeFileSync(path.join(artifactDirectory, "candidate.json"), serialized.padEnd(MAX_CANDIDATE_BYTES + 1, " "));
		assert.throws(() => readArtifact({ artifactDirectory, repositoryRoot, baseSha }), /크기 제한/);
		const manyAssessments = Array.from({ length: 40 }, (_, index) => ({ ...assessment, flowId: `flow-${index}` }));
		assert.throws(() => validateCandidate({ ...candidate, assessments: manyAssessments }, { ...context, flows: manyAssessments.map((item) => ({ id: item.flowId })) }), /256 KiB/);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
