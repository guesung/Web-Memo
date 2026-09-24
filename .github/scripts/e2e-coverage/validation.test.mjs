import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isoWeek, validateCandidate, validateChanges, validateFocusFlowId, validateReport } from "./validation.mjs";

const CONTEXT = { flows: [{ id: "memo-create" }], projects: ["mocked"], trackedFiles: ["pages/side-panel/index.ts", "e2e/tests/mocked/existing.test.ts"] };
const CANDIDATE = { status: "gap", scenarioId: "memo-create", reason: "저장 이후 동작이 빠졌습니다", productRefs: ["pages/side-panel/index.ts"], existingTestRefs: ["e2e/tests/mocked/existing.test.ts"], missingAction: "메모 저장", expectedResult: "새 메모 표시", testFile: "e2e/tests/mocked/memoSave.test.ts", project: "mocked" };
CANDIDATE.assessments = [{ flowId: "memo-create", status: "gap", reason: "저장 후 표시 검증 누락", productRefs: CANDIDATE.productRefs, existingTestRefs: CANDIDATE.existingTestRefs }];
const report = () => ({
	config: { rootDir: path.resolve("e2e/tests") },
	errors: [],
	stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 },
	suites: [{ specs: [{ file: "mocked/memoSave.test.ts", tests: [{ projectName: "mocked", expectedStatus: "passed", status: "expected", results: [{ status: "passed", retry: 0 }] }] }] }],
});

test("핵심 메모 흐름은 각 사용자 행동과 기대 결과를 명시한다", () => {
	const flows = JSON.parse(readFileSync(".github/e2e-core-flows.json", "utf8"));
	for (const id of ["memo-create", "memo-read", "memo-update", "memo-delete", "memo-rediscover"]) {
		assert.equal(flows.filter((flow) => flow.id === id).length, 1);
	}
	assert.ok(flows.every((flow) => flow.action.trim() && flow.expectedResult.trim()));
});

test("ISO 주차는 연도 경계에서도 올바른 순환 주차를 반환한다", () => {
	assert.deepEqual(isoWeek(new Date("2021-01-01T12:00:00Z")), { year: 2020, week: 53, label: "2020-W53" });
});

test("후보는 실제 구성 프로젝트와 누락 행동·기대 결과 근거가 필요하다", () => {
	assert.equal(validateCandidate(CANDIDATE, CONTEXT), CANDIDATE);
	for (const patch of [{ project: "web" }, { testFile: "../escape.test.ts" }, { missingAction: "" }, { expectedResult: null }, { productRefs: [] }, { existingTestRefs: [] }, { existingTestRefs: ["e2e/tests/fixtures.ts"] }, { unexpected: true }, { status: "none" }]) {
		assert.throws(() => validateCandidate({ ...CANDIDATE, ...patch }, CONTEXT));
	}
	assert.equal(validateCandidate({ ...CANDIDATE, status: "none", testFile: "", project: "", assessments: [{ ...CANDIDATE.assessments[0], status: "covered" }] }, CONTEXT).status, "none");
});

test("리포트는 실제 선택 파일의 단일 통과만 인정한다", () => {
	assert.equal(validateReport(report(), CANDIDATE).expected, 1);
	for (const patch of [{ skipped: 1 }, { expected: 0 }, { flaky: 1 }, { unexpected: 1 }]) {
		const value = report();
		Object.assign(value.stats, patch);
		assert.throws(() => validateReport(value, CANDIDATE));
	}
	for (const mutation of [
		(value) => { value.errors.push({ message: "teardown failed" }); },
		(value) => { value.suites[0].specs[0].file = "mocked/other.test.ts"; },
		(value) => { value.suites[0].specs[0].tests[0].results[0].retry = 1; },
		(value) => { value.suites[0].specs[0].tests[0].expectedStatus = "failed"; },
		(value) => { value.suites[0].specs[0].tests[0].projectName = "integration"; },
		(value) => { value.suites = []; },
	]) {
		const value = report();
		mutation(value);
		assert.throws(() => validateReport(value, CANDIDATE));
	}
});

test("변경 검사는 기존 수정·삭제·추가 파일·심볼릭 링크와 생략 표시를 거부한다", () => {
	const previous = process.cwd();
	const directory = mkdtempSync(path.join(os.tmpdir(), "e2e-coverage-test-"));
	const git = (...args) => execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
	try {
		process.chdir(directory);
		git("init");
		writeFileSync("existing.txt", "original");
		git("add", ".");
		git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "initial");
		const baseSha = git("rev-parse", "HEAD");
		mkdirSync("e2e/tests/mocked", { recursive: true });
		writeFileSync(CANDIDATE.testFile, "test('저장', async () => {});");
		const check = () => validateChanges({ baseSha, candidate: CANDIDATE });
		assert.equal(check(), CANDIDATE.testFile);
		writeFileSync("existing.txt", "modified");
		assert.throws(check);
		git("restore", "existing.txt");
		rmSync("existing.txt");
		assert.throws(check);
		git("restore", "existing.txt");
		writeFileSync("extra.ts", "extra");
		assert.throws(check);
		rmSync("extra.ts");
		for (const modifier of ["skip", "fixme", "only", "fail"]) {
			writeFileSync(CANDIDATE.testFile, `test.${modifier}('저장', async () => {});`);
			assert.throws(check);
		}
		rmSync(CANDIDATE.testFile);
		symlinkSync(path.join(directory, "existing.txt"), CANDIDATE.testFile);
		assert.throws(check);
	} finally {
		process.chdir(previous);
		rmSync(directory, { recursive: true, force: true });
	}
});

test("요약은 정상 무변경 결과를 유지하고 실패·dry run의 이유를 기록한다", () => {
	const directory = mkdtempSync(path.join(os.tmpdir(), "e2e-coverage-summary-"));
	try {
		const resultFile = path.join(directory, "result.json");
		for (const status of ["duplicate", "none", "insufficient"]) {
			writeFileSync(resultFile, JSON.stringify({ status }));
			execFileSync(process.execPath, [".github/scripts/e2e-coverage/maintain.mjs", "summary"], { env: { ...process.env, E2E_COVERAGE_DIR: directory, E2E_RUN_STATUS: "success", GITHUB_REF: "refs/heads/master", GITHUB_STEP_SUMMARY: "" } });
			assert.equal(JSON.parse(readFileSync(resultFile, "utf8")).status, status);
		}
		writeFileSync(resultFile, JSON.stringify({ status: "verified", error: "기존 진단" }));
		execFileSync(process.execPath, [".github/scripts/e2e-coverage/maintain.mjs", "summary"], { env: { ...process.env, E2E_COVERAGE_DIR: directory, E2E_RUN_STATUS: "failure", GITHUB_REF: "refs/heads/feature", GITHUB_STEP_SUMMARY: "" } });
		const result = JSON.parse(readFileSync(resultFile, "utf8"));
		assert.equal(result.status, "failed");
		assert.equal(result.previousStatus, "verified");
		assert.equal(result.error, "기존 진단");
		assert.equal(result.dryRun, true);
		assert.match(result.publicationSkipped, /master/);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});


test("전체 흐름 판정은 누락·중복·잘못된 근거를 거부하고 다른 흐름의 gap을 선택한다", () => {
	const context = { ...CONTEXT, flows: [{ id: "memo-create" }, { id: "memo-read" }] };
	const covered = { ...CANDIDATE.assessments[0], flowId: "memo-read", status: "covered" };
	const value = { ...CANDIDATE, assessments: [...CANDIDATE.assessments, covered] };
	assert.equal(validateCandidate(value, context), value);
	for (const assessments of [
		[CANDIDATE.assessments[0]],
		[covered, covered],
		[...value.assessments, covered],
		[value.assessments[0], { ...covered, flowId: "unknown" }],
		[value.assessments[0], { ...covered, status: "unknown" }],
		[value.assessments[0], { ...covered, reason: "" }],
		[value.assessments[0], { ...covered, productRefs: ["untracked.ts"] }],
		[value.assessments[0], { ...covered, existingTestRefs: ["pages/side-panel/index.ts"] }],
		[value.assessments[0], { ...covered, existingTestRefs: [] }],
		[value.assessments[0], { ...covered, extra: true }],
	]) {
		assert.throws(() => validateCandidate({ ...value, assessments }, context));
	}
	assert.throws(() => validateCandidate({ ...value, status: "none", scenarioId: "memo-read", testFile: "", project: "" }, context));
	assert.throws(() => validateCandidate({ ...value, status: "insufficient", testFile: "", project: "" }, context));
	const allCovered = { ...value, status: "none", testFile: "", project: "", assessments: value.assessments.map((assessment) => ({ ...assessment, status: "covered" })) };
	assert.equal(validateCandidate(allCovered, context).status, "none");
	const insufficient = { ...allCovered, status: "insufficient", assessments: [{ ...value.assessments[0], status: "insufficient" }, covered] };
	assert.equal(validateCandidate(insufficient, context).status, "insufficient");
	assert.throws(() => validateCandidate({ ...insufficient, status: "none" }, context));
	const focused = { ...context, focusFlowId: "memo-read" };
	const twoGaps = { ...value, assessments: [value.assessments[0], { ...covered, status: "gap" }] };
	assert.throws(() => validateCandidate(twoGaps, focused));
	assert.equal(validateCandidate({ ...twoGaps, scenarioId: "memo-read" }, focused).scenarioId, "memo-read");
	assert.equal(validateFocusFlowId("memo-read", context.flows), "memo-read");
	assert.equal(validateFocusFlowId("", context.flows), "");
	assert.throws(() => validateFocusFlowId("unknown", context.flows));
});

test("잘못된 AI JSON과 전체 점검 누락은 성공한 insufficient로 처리하지 않는다", () => {
	const directory = mkdtempSync(path.join(os.tmpdir(), "e2e-coverage-invalid-"));
	try {
		writeFileSync(path.join(directory, "context.json"), JSON.stringify(CONTEXT));
		for (const input of ["not json", JSON.stringify({ ...CANDIDATE, assessments: [] }), JSON.stringify({ ...CANDIDATE, productRefs: ["untracked.ts"] })]) {
			assert.throws(() => execFileSync(process.execPath, [".github/scripts/e2e-coverage/maintain.mjs", "candidate"], {
				env: { ...process.env, E2E_COVERAGE_DIR: directory, E2E_CANDIDATE_JSON: input, GITHUB_OUTPUT: "" }, stdio: "pipe",
			}));
			const result = JSON.parse(readFileSync(path.join(directory, "result.json"), "utf8"));
			assert.equal(result.status, "failed");
			assert.equal(result.stage, "candidate");
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});


test("실행 컨텍스트는 전체 목록을 유지하면서 유효한 우선 흐름만 받는다", () => {
	const directory = mkdtempSync(path.join(os.tmpdir(), "e2e-coverage-context-"));
	const baseSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	const flows = JSON.parse(readFileSync(".github/e2e-core-flows.json", "utf8"));
	const invoke = (focusFlowId) => execFileSync(process.execPath, [".github/scripts/e2e-coverage/maintain.mjs", "context"], {
		env: { ...process.env, E2E_COVERAGE_DIR: directory, E2E_BASE_SHA: baseSha, E2E_FOCUS_FLOW_ID: focusFlowId, GITHUB_OUTPUT: "" }, stdio: "pipe",
	});
	try {
		invoke(flows[0].id);
		const context = JSON.parse(readFileSync(path.join(directory, "context.json"), "utf8"));
		assert.equal(context.focusFlowId, flows[0].id);
		assert.deepEqual(context.flows, flows);
		assert.ok(context.trackedFiles.includes(".github/e2e-core-flows.json"));
		assert.throws(() => invoke("unknown-flow"));
		assert.equal(JSON.parse(readFileSync(path.join(directory, "result.json"), "utf8")).status, "failed");
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
