import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";

/** 자식 프로세스의 출력에 자격증명이 섞여도 실패 로그에 노출하지 않습니다. */
export const run = (command, args) => {
	try {
		return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 }).trim();
	} catch {
		throw Object.assign(new Error(`${command} 실행 실패`), { isSafe: true });
	}
};

/** ISO 주차를 UTC 기준으로 계산합니다. */
export const isoWeek = (date = new Date()) => {
	const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
	const year = thursday.getUTCFullYear();
	const week = Math.ceil(((thursday - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);

	return { year, week, label: `${year}-W${String(week).padStart(2, "0")}` };
};

const validPath = (value) => typeof value === "string" && /^[a-zA-Z0-9_./-]+$/.test(value) && !value.startsWith("/") && !value.split("/").includes("..");

/** 모델이 반환한 후보를 제한된 상태·근거·테스트 경로 스키마로 검사합니다. */
export const validateCandidate = (candidate, context) => {
	const keys = ["status", "scenarioId", "reason", "productRefs", "existingTestRefs", "testFile", "project", "missingAction", "expectedResult"];
	if (!candidate || Object.keys(candidate).sort().join() !== keys.sort().join() || !["gap", "none", "insufficient"].includes(candidate.status)) {
		throw Object.assign(new Error("후보 스키마가 올바르지 않습니다"), { isSafe: true });
	}
	if (!context.flows.some((flow) => flow.id === candidate.scenarioId) || typeof candidate.reason !== "string" || !candidate.reason.trim() || candidate.reason.length > 3000) {
		throw Object.assign(new Error("핵심 흐름 또는 후보 근거가 없습니다"), { isSafe: true });
	}
	for (const key of ["missingAction", "expectedResult"]) {
		if (typeof candidate[key] !== "string" || candidate[key].length > 3000 || (candidate.status === "gap" && !candidate[key].trim())) {
			throw Object.assign(new Error("누락 행동과 기대 결과 근거가 필요합니다"), { isSafe: true });
		}
	}
	for (const key of ["productRefs", "existingTestRefs"]) {
		if (!Array.isArray(candidate[key]) || candidate[key].length > 30 || !candidate[key].every(validPath)) {
			throw Object.assign(new Error("근거 파일 목록이 올바르지 않습니다"), { isSafe: true });
		}
	}
	if (candidate.status === "gap") {
		if (!candidate.productRefs.length || !candidate.existingTestRefs.length || candidate.existingTestRefs.some((file) => !/^e2e\/tests\/.+\.test\.ts$/.test(file)) || !context.projects.includes(candidate.project) || !validPath(candidate.testFile) || !new RegExp(`^e2e/tests/${candidate.project}/[a-zA-Z0-9_-]+\\.test\\.ts$`).test(candidate.testFile)) {
			throw Object.assign(new Error("추가 테스트 경로 또는 근거가 올바르지 않습니다"), { isSafe: true });
		}
	} else if (candidate.testFile !== "" || candidate.project !== "") {
		throw Object.assign(new Error("테스트가 없는 결과에는 경로와 프로젝트를 지정할 수 없습니다"), { isSafe: true });
	}

	return candidate;
};

/** 기존 파일 변경 없이 새 일반 테스트 하나만 추가됐는지 검사합니다. */
export const validateChanges = ({ baseSha, candidate }) => {
	if (!/^[a-f0-9]{40}$/.test(baseSha ?? "")) {
		throw Object.assign(new Error("E2E_BASE_SHA는 전체 커밋 SHA여야 합니다"), { isSafe: true });
	}
	const tracked = run("git", ["diff", "--name-status", "--no-renames", baseSha, "--"]).split("\n").filter(Boolean);
	const untracked = run("git", ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
	const changes = [...tracked, ...untracked.map((file) => `A\t${file}`)];
	if (candidate.status !== "gap" || changes.length !== 1 || changes[0] !== `A\t${candidate.testFile}`) {
		throw Object.assign(new Error("새 테스트 파일 정확히 한 개만 허용됩니다"), { isSafe: true });
	}
	const components = candidate.testFile.split("/");
	for (let index = 1; index <= components.length; index += 1) {
		const stat = lstatSync(components.slice(0, index).join("/"));
		if (stat.isSymbolicLink() || (index === components.length && (!stat.isFile() || stat.nlink !== 1))) {
			throw Object.assign(new Error("링크가 아닌 일반 테스트 파일만 허용됩니다"), { isSafe: true });
		}
	}
	const source = readFileSync(candidate.testFile, "utf8");
	if (source.length > 30000 || /\b(?:skip|fixme|only|fail)\b/.test(source)) {
		throw Object.assign(new Error("테스트 생략·집중·예상 실패 표시는 허용되지 않습니다"), { isSafe: true });
	}

	return candidate.testFile;
};

/** JSON reporter의 집계와 실제 단일 테스트 실행을 함께 검사합니다. */
export const validateReport = (report, candidate) => {
	const stats = report?.stats;
	if (!stats || stats.expected !== 1 || stats.skipped !== 0 || stats.unexpected !== 0 || stats.flaky !== 0 || !Array.isArray(report.errors) || report.errors.length) {
		throw Object.assign(new Error("E2E 결과는 통과 1개, 생략·실패·불안정 0개여야 합니다"), { isSafe: true });
	}
	const specs = [];
	const visit = (suite) => {
		specs.push(...(suite.specs ?? []));
		for (const child of suite.suites ?? []) {
			visit(child);
		}
	};
	visit(report);
	const tests = specs.flatMap((spec) => (spec.tests ?? []).map((test) => ({ spec, test })));
	if (tests.length !== 1) {
		throw Object.assign(new Error("실행된 테스트가 정확히 하나여야 합니다"), { isSafe: true });
	}
	const { spec, test } = tests[0];
	const expectedFile = path.resolve(candidate.testFile);
	const reportedFile = path.resolve(report.config?.rootDir ?? "e2e/tests", spec.file ?? "");
	if (reportedFile !== expectedFile || test.projectName !== candidate.project || test.expectedStatus !== "passed" || test.status !== "expected" || test.results?.length !== 1 || test.results[0].status !== "passed" || test.results[0].retry !== 0) {
		throw Object.assign(new Error("선택된 테스트가 재시도 없이 실제 통과해야 합니다"), { isSafe: true });
	}

	return { expected: 1, skipped: 0, unexpected: 0, flaky: 0 };
};
