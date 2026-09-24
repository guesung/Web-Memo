import { appendFileSync, constants, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { copyArtifactTest, exportArtifact, readArtifact, testHash, validateTestHash } from "./artifact.mjs";
import { isoWeek, run, validateCandidate, validateChanges, validateReport } from "./validation.mjs";

const directory = path.resolve(process.env.E2E_COVERAGE_DIR ?? path.join(process.env.RUNNER_TEMP ?? "/tmp", "e2e-coverage"));
const repositoryRoot = path.resolve(run("git", ["rev-parse", "--show-toplevel"]));
if (directory === repositoryRoot || directory.startsWith(`${repositoryRoot}${path.sep}`)) {
	throw Object.assign(new Error("결과 디렉터리는 저장소 밖에 있어야 합니다"), { isSafe: true });
}
mkdirSync(directory, { recursive: true });
const read = (name) => JSON.parse(readFileSync(path.join(directory, `${name}.json`), "utf8"));
const write = (name, value) => writeFileSync(path.join(directory, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
const output = (key, value) => {
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
	}
};
const baseSha = process.env.E2E_BASE_SHA;
const candidate = () => validateCandidate(read("candidate"), read("context"));
const openPullRequests = () => {
	const repository = process.env.GITHUB_REPOSITORY;
	if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
		throw Object.assign(new Error("GITHUB_REPOSITORY가 필요합니다"), { isSafe: true });
	}
	const pages = JSON.parse(run("gh", ["api", "--paginate", "--slurp", `repos/${repository}/pulls?state=open&per_page=100`]));

	return pages.flat().filter((pull) => pull.head?.ref?.startsWith("chore/auto-e2e-") && pull.head?.repo?.full_name === repository);
};

const commands = {
	precheck: () => {
		const duplicates = openPullRequests();
		write("result", { status: duplicates.length ? "duplicate" : "pending", duplicatePullRequests: duplicates.map((pull) => pull.html_url) });
		output("proceed", String(duplicates.length === 0));
	},
	context: () => {
		if (!/^[a-f0-9]{40}$/.test(baseSha ?? "") || run("git", ["rev-parse", "HEAD"]) !== baseSha) {
			throw Object.assign(new Error("분석 기준 커밋이 현재 checkout과 다릅니다"), { isSafe: true });
		}
		const flows = JSON.parse(readFileSync(".github/e2e-core-flows.json", "utf8"));
		if (!Array.isArray(flows) || !flows.length || flows.some((flow) => !flow.action?.trim() || !flow.expectedResult?.trim())) {
			throw Object.assign(new Error("핵심 흐름의 사용자 행동과 기대 결과가 필요합니다"), { isSafe: true });
		}
		const config = readFileSync("e2e/playwright.config.ts", "utf8");
		const configuredProjects = [...config.matchAll(/name:\s*["']([a-zA-Z0-9_-]+)["']/g)].map((match) => match[1]);
		const projects = configuredProjects.includes("mocked") ? ["mocked"] : configuredProjects.filter((project) => ["web", "extension", "hybrid"].includes(project));
		if (!projects.length) {
			throw Object.assign(new Error("Playwright 프로젝트를 찾지 못했습니다"), { isSafe: true });
		}
		const week = isoWeek();
		const recentFiles = [...new Set(run("git", ["log", "--since=14 days ago", "--format=", "--name-only", baseSha, "--", "apps/", "pages/", "packages/", "e2e/"]).split("\n").filter(Boolean))].slice(0, 200);
		const tests = run("git", ["ls-files", "e2e/tests"]).split("\n").filter((file) => file.endsWith(".test.ts"));
		const recentFlows = flows.filter((flow) => recentFiles.some((file) => flow.sources.some((source) => file.startsWith(source))));
		write("context", { baseSha, week: week.label, projects, flows, recentFiles, recentFlows, rotationFlow: flows[(week.week - 1) % flows.length], tests });
		output("context_file", path.join(directory, "context.json"));
		output("week", week.label);
	},
	candidate: () => {
		let value;
		try {
			value = validateCandidate(JSON.parse(process.env.E2E_CANDIDATE_JSON ?? ""), read("context"));
			const trackedFiles = new Set(run("git", ["ls-files"]).split("\n"));
			if (![...value.productRefs, ...value.existingTestRefs].every((file) => trackedFiles.has(file)) || value.existingTestRefs.some((file) => !file.startsWith("e2e/tests/"))) {
				throw Object.assign(new Error("후보 근거가 실제 추적 파일과 일치하지 않습니다"), { isSafe: true });
			}
		} catch {
			write("result", { status: "insufficient", reason: "AI 결과의 형식 또는 근거 파일을 확인할 수 없습니다" });
			output("status", "insufficient");
			return;
		}
		write("candidate", value);
		write("result", { status: value.status, scenarioId: value.scenarioId });
		output("status", value.status);
		output("test_file", value.testFile);
		output("project", value.project);
	},
	changes: () => {
		const value = candidate();
		validateChanges({ baseSha, candidate: value });
		output("test_file", value.testFile);
		output("project", value.project);
	},
	report: () => {
		const value = candidate();
		validateChanges({ baseSha, candidate: value });
		if (process.env.E2E_TEST_SHA256 || existsSync(path.join(directory, "import-integrity.json"))) {
			validateTestHash(value.testFile, process.env.E2E_TEST_SHA256);
		}
		const stats = validateReport(read("playwright"), value);
		write("result", { status: "verified", scenarioId: value.scenarioId, testFile: value.testFile, project: value.project, stats });
	},
	"export-artifact": () => {
		commands.report();
		output("artifact_dir", exportArtifact({ directory, candidate: candidate(), baseSha }));
		output("ready", "true");
	},
	"export-verified-artifact": () => {
		validateTestHash(candidate().testFile, process.env.E2E_TEST_SHA256);
		commands.report();
		output("artifact_dir", exportArtifact({ directory, candidate: candidate(), baseSha, includeReport: true }));
		output("report_sha256", testHash(path.join(directory, "playwright.json")));
		output("ready", "true");
	},
	"import-artifact": () => {
		if (run("git", ["status", "--porcelain"])) {
			throw Object.assign(new Error("게시 입력은 깨끗한 checkout에서만 가져올 수 있습니다"), { isSafe: true });
		}
		commands.context();
		const artifactDirectory = process.env.E2E_ARTIFACT_DIR;
		const value = validateCandidate(readArtifact({ artifactDirectory, repositoryRoot, baseSha, requireReport: process.env.E2E_REQUIRE_REPORT === "true", expectedTestHash: process.env.E2E_EXPECTED_TEST_SHA256, expectedCandidateHash: process.env.E2E_EXPECTED_CANDIDATE_SHA256, expectedReportHash: process.env.E2E_EXPECTED_REPORT_SHA256 }), read("context"));
		const trackedFiles = new Set(run("git", ["ls-files"]).split("\n"));
		if (value.status !== "gap" || ![...value.productRefs, ...value.existingTestRefs].every((file) => trackedFiles.has(file)) || value.existingTestRefs.some((file) => !file.startsWith("e2e/tests/"))) {
			throw Object.assign(new Error("게시 후보 근거 파일이 checkout과 일치하지 않습니다"), { isSafe: true });
		}
		copyFileSync(path.join(artifactDirectory, "candidate.json"), path.join(directory, "candidate.json"), constants.COPYFILE_EXCL);
		output("candidate_sha256", testHash(path.join(directory, "candidate.json")));
		copyArtifactTest({ artifactDirectory, candidate: value, repositoryRoot });
		const sha256 = testHash(value.testFile);
		write("import-integrity", { testFile: value.testFile, sha256 });
		output("test_sha256", sha256);
		commands.changes();
		if (process.env.E2E_REQUIRE_REPORT === "true") {
			copyFileSync(path.join(artifactDirectory, "playwright.json"), path.join(directory, "playwright.json"), constants.COPYFILE_EXCL);
		}
		write("result", { status: "imported", scenarioId: value.scenarioId });
	},
	publish: () => {
		const value = candidate();
		validateTestHash(value.testFile, process.env.E2E_TEST_SHA256);
		if (process.env.E2E_DRY_RUN === "true" || process.env.GITHUB_REF !== "refs/heads/master") {
			throw Object.assign(new Error("master 외 실행 또는 dry run은 게시할 수 없습니다"), { isSafe: true });
		}
		if (read("result").status !== "verified") {
			throw Object.assign(new Error("검증 완료 결과가 필요합니다"), { isSafe: true });
		}
		commands.report();
		const duplicates = openPullRequests();
		if (duplicates.length) {
			write("result", { status: "duplicate", duplicatePullRequests: duplicates.map((pull) => pull.html_url) });
			return;
		}
		const runId = process.env.GITHUB_RUN_ID;
		const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
		if (!/^\d+$/.test(runId ?? "") || !/^\d+$/.test(attempt)) {
			throw Object.assign(new Error("Actions 실행 식별자가 필요합니다"), { isSafe: true });
		}
		const branch = `chore/auto-e2e-${read("context").week}-${runId}-${attempt}`;
		const flow = read("context").flows.find((item) => item.id === value.scenarioId);
		const title = `test: ${flow.name} E2E 누락 시나리오 추가`;
		const bodyFile = path.join(directory, "pull-request.md");
		writeFileSync(bodyFile, `## 설명\n${value.reason}\n\n누락 행동: ${value.missingAction}\n\n기대 결과: ${value.expectedResult}\n\n## 관련 이슈\n- 없음\n\n## 변경 유형\n- E2E 테스트 추가\n\n## 체크리스트\n- [x] 새 테스트 1개만 추가\n- [x] 재시도 없이 1개 통과, 생략·실패·불안정 0개\n- [x] 기존 테스트와 소스 파일 변경 없음\n\n검증 명령(모두 통과):\n- pnpm check\n- pnpm type-check\n- pnpm build:extension\n${value.project === "web" ? "- pnpm -F e2e exec playwright test --project=setup\n" : ""}- pnpm -F e2e exec playwright test ${value.testFile.slice(4)} --project=${value.project} --retries=0 ${value.project === "web" ? "--no-deps " : ""}--reporter=json\n\n근거 파일: ${value.productRefs.join(", ")}\n기존 테스트: ${value.existingTestRefs.join(", ")}\n`);
		run("git", ["switch", "-c", branch]);
		run("git", ["add", "--", value.testFile]);
		run("git", ["-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", title]);
		run("gh", ["auth", "setup-git"]);
		run("git", ["push", "origin", `HEAD:refs/heads/${branch}`]);
		const url = run("gh", ["pr", "create", "--repo", process.env.GITHUB_REPOSITORY, "--base", "master", "--head", branch, "--title", title, "--body-file", bodyFile]);
		write("result", { ...read("result"), status: "published", pullRequest: url });
		output("pr_url", url);
	},
	summary: () => {
		let result = { status: "not-started" };
		if (existsSync(path.join(directory, "result.json"))) {
			result = read("result");
		}
		result.runStatus = process.env.E2E_RUN_STATUS ?? "unknown";
		result.dryRun = process.env.E2E_DRY_RUN === "true" || (Boolean(process.env.GITHUB_REF) && process.env.GITHUB_REF !== "refs/heads/master");
		if (result.dryRun || process.env.E2E_PUBLISH_SKIP_REASON) {
			result.publicationSkipped = process.env.E2E_PUBLISH_SKIP_REASON || "dry run 또는 master 외 ref에서는 PR 게시를 생략합니다";
		}
		if (result.runStatus === "failure") {
			result.previousStatus = result.status;
			result.status = "failed";
			result.error ??= "워크플로 단계 실패: Actions 로그를 확인하세요";
		}
		write("result", result);
		if (process.env.GITHUB_STEP_SUMMARY) {
			appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 주간 E2E 누락 점검\n\n결과: ${result.status}\n\n실행 상태: ${result.runStatus}\n\n진단: ${result.error ?? "없음"}\n\nDry run: ${result.dryRun}\n\n게시 생략: ${result.publicationSkipped ?? "없음"}\n\n세부 결과는 JSON 아티팩트를 확인하세요.\n`);
		}
	},
};

try {
	const command = process.argv[2];
	if (!Object.hasOwn(commands, command)) {
		throw Object.assign(new Error("알 수 없는 E2E 점검 명령입니다"), { isSafe: true });
	}
	commands[command]();
} catch (error) {
	const message = error.isSafe === true ? error.message : "입력 JSON·파일을 읽거나 처리하지 못했습니다";
	write("result", { status: "failed", stage: Object.hasOwn(commands, process.argv[2]) ? process.argv[2] : "unknown", error: message });
	console.error(message);
	process.exitCode = 1;
}
