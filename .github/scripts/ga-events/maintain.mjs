import { createHash } from "node:crypto";
import { appendFileSync, constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TYPE_FILE, extractEventNames, isoWeek, run, validateCandidate, validateChanges } from "./validation.mjs";

const directory = path.resolve(process.env.GA_EVENTS_DIR ?? path.join(process.env.RUNNER_TEMP ?? "/tmp", "ga-events"));
const repositoryRoot = path.resolve(run("git", ["rev-parse", "--show-toplevel"]));
if (directory === repositoryRoot || directory.startsWith(`${repositoryRoot}${path.sep}`)) {
	throw Object.assign(new Error("결과 디렉터리는 저장소 밖에 있어야 합니다"), { isSafe: true });
}
mkdirSync(directory, { recursive: true });

const MAX_PATCH_BYTES = 200 * 1024;
const baseSha = process.env.GA_EVENTS_BASE_SHA;
const read = (name) => JSON.parse(readFileSync(path.join(directory, `${name}.json`), "utf8"));
const write = (name, value) => writeFileSync(path.join(directory, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
const output = (key, value) => {
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
	}
};
const fail = (message) => {
	throw Object.assign(new Error(message), { isSafe: true });
};
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const validationContext = () => {
	const context = read("context");

	return { existingEvents: context.existingEvents, trackedFiles: context.trackedFiles };
};
const candidate = () => validateCandidate(read("candidate"), validationContext());
const openPullRequests = () => {
	const repository = process.env.GITHUB_REPOSITORY;
	if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
		fail("GITHUB_REPOSITORY가 필요합니다");
	}
	const pages = JSON.parse(run("gh", ["api", "--paginate", "--slurp", `repos/${repository}/pulls?state=open&per_page=100`]));

	return pages.flat().filter((pull) => pull.head?.ref?.startsWith("chore/auto-ga-events-") && pull.head?.repo?.full_name === repository);
};
const assertRegular = (file, maxBytes) => {
	const stat = lstatSync(file);
	if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.size > maxBytes) {
		fail("아티팩트가 일반 파일이 아니거나 크기 제한을 초과했습니다");
	}
};

const commands = {
	precheck: () => {
		const duplicates = openPullRequests();
		write("result", { status: duplicates.length ? "duplicate" : "pending", duplicatePullRequests: duplicates.map((pull) => pull.html_url) });
		output("proceed", String(duplicates.length === 0));
	},
	context: () => {
		if (!/^[a-f0-9]{40}$/.test(baseSha ?? "") || run("git", ["rev-parse", "HEAD"]) !== baseSha) {
			fail("분석 기준 커밋이 현재 checkout과 다릅니다");
		}
		const existingEvents = extractEventNames(readFileSync(TYPE_FILE, "utf8"));
		if (!existingEvents.length) {
			fail("이벤트 유니온에서 이벤트를 찾지 못했습니다");
		}
		const trackedFiles = run("git", ["ls-files"]).split("\n").filter(Boolean);
		const recentFiles = [...new Set(run("git", ["log", "--since=14 days ago", "--format=", "--name-only", baseSha, "--", "apps/web/src/", "apps/chrome-extension/src/", "pages/", "packages/shared/src/"]).split("\n").filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file)))].filter((file) => trackedFiles.includes(file)).slice(0, 200);
		const flows = JSON.parse(readFileSync(".github/e2e-core-flows.json", "utf8"));
		write("context", { baseSha, week: isoWeek().label, existingEvents, trackedFiles, recentFiles, flows });
		output("context_file", path.join(directory, "context.json"));
	},
	candidate: () => {
		const value = validateCandidate(JSON.parse(process.env.GA_EVENTS_CANDIDATE_JSON ?? ""), validationContext());
		write("candidate", value);
		write("result", { status: value.status, events: value.events.map((event) => event.name) });
		output("status", value.status);
	},
	changes: () => {
		validateChanges({ baseSha, candidate: candidate() });
	},
	"export-patch": () => {
		const value = candidate();
		validateChanges({ baseSha, candidate: value });
		const patch = run("git", ["diff", "--binary", baseSha, "--"]);
		if (Buffer.byteLength(patch) > MAX_PATCH_BYTES) {
			fail("패치가 크기 제한을 초과했습니다");
		}
		const target = path.join(directory, "publish-artifact");
		mkdirSync(target);
		writeFileSync(path.join(target, "changes.patch"), `${patch}\n`, { flag: "wx" });
		writeFileSync(path.join(target, "base.json"), JSON.stringify({ baseSha }), { flag: "wx" });
		copyFileSync(path.join(directory, "candidate.json"), path.join(target, "candidate.json"), constants.COPYFILE_EXCL);
		output("patch_sha256", sha256(path.join(target, "changes.patch")));
		output("candidate_sha256", sha256(path.join(target, "candidate.json")));
		output("ready", "true");
		write("result", { status: "verified", events: value.events.map((event) => event.name) });
	},
	"import-patch": () => {
		if (run("git", ["status", "--porcelain"])) {
			fail("패치는 깨끗한 checkout에서만 가져올 수 있습니다");
		}
		commands.context();
		const source = process.env.GA_EVENTS_ARTIFACT_DIR;
		if (!source || !path.isAbsolute(source) || realpathSync(source) !== source || source === repositoryRoot || source.startsWith(`${repositoryRoot}${path.sep}`)) {
			fail("아티팩트는 저장소 밖의 링크가 아닌 디렉터리여야 합니다");
		}
		if (readdirSync(source).sort().join() !== "base.json,candidate.json,changes.patch") {
			fail("게시 아티팩트는 지정된 파일만 포함해야 합니다");
		}
		assertRegular(path.join(source, "base.json"), 1024);
		assertRegular(path.join(source, "candidate.json"), 256 * 1024);
		assertRegular(path.join(source, "changes.patch"), MAX_PATCH_BYTES + 1024);
		for (const [name, expected] of [["changes.patch", process.env.GA_EVENTS_EXPECTED_PATCH_SHA256], ["candidate.json", process.env.GA_EVENTS_EXPECTED_CANDIDATE_SHA256]]) {
			if (!/^[a-f0-9]{64}$/.test(expected ?? "") || sha256(path.join(source, name)) !== expected) {
				fail("검증 단계에서 내보낸 파일의 SHA-256이 다릅니다");
			}
		}
		const metadata = JSON.parse(readFileSync(path.join(source, "base.json"), "utf8"));
		if (metadata.baseSha !== baseSha || Object.keys(metadata).join() !== "baseSha") {
			fail("분석 이후 master가 변경되어 다시 분석해야 합니다");
		}
		const value = validateCandidate(JSON.parse(readFileSync(path.join(source, "candidate.json"), "utf8")), validationContext());
		copyFileSync(path.join(source, "candidate.json"), path.join(directory, "candidate.json"), constants.COPYFILE_EXCL);
		run("git", ["apply", "--check", path.join(source, "changes.patch")]);
		run("git", ["apply", path.join(source, "changes.patch")]);
		validateChanges({ baseSha, candidate: value });
		write("result", { status: "imported", events: value.events.map((event) => event.name) });
	},
	publish: () => {
		if (process.env.GA_EVENTS_DRY_RUN === "true" || process.env.GITHUB_REF !== "refs/heads/master") {
			fail("master 외 실행 또는 dry run은 게시할 수 없습니다");
		}
		const value = candidate();
		const files = validateChanges({ baseSha, candidate: value });
		const duplicates = openPullRequests();
		if (duplicates.length) {
			write("result", { status: "duplicate", duplicatePullRequests: duplicates.map((pull) => pull.html_url) });
			return;
		}
		const runId = process.env.GITHUB_RUN_ID;
		const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
		if (!/^\d+$/.test(runId ?? "") || !/^\d+$/.test(attempt)) {
			fail("Actions 실행 식별자가 필요합니다");
		}
		const names = value.events.map((event) => event.name);
		const branch = `chore/auto-ga-events-${read("context").week}-${runId}-${attempt}`;
		const title = `feat: GA 이벤트 추가 (${names.join(", ")})`;
		const bodyFile = path.join(directory, "pull-request.md");
		const eventLines = value.events.map((event) => `- \`${event.name}\` (${event.category}) — ${event.trigger}\n  - 속성: ${event.properties.length ? event.properties.map((key) => `\`${key}\``).join(", ") : "없음"}\n  - 답하려는 질문: ${event.question}`).join("\n");
		writeFileSync(bodyFile, `## 설명\n${value.reason}\n\n${eventLines}\n\n## 관련 이슈\n- 없음\n\n## 변경 유형\n- GA 이벤트 추가\n\n## 체크리스트\n- [x] 이벤트 ${names.length}개만 추가 (기존 이벤트 정의 변경 없음)\n- [x] \`type.ts\`, \`docs/events.md\`, \`docs/analytics.md\` 동시 갱신\n- [x] 이메일·입력 원문 등 금지 속성 없음\n\n검증 명령(모두 통과):\n- pnpm check\n- pnpm type-check\n- pnpm exec vitest run packages/shared/src/modules/analytics\n\n변경 파일: ${files.join(", ")}\n`);
		run("git", ["switch", "-c", branch]);
		run("git", ["add", "--", ...files]);
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
		result.runStatus = process.env.GA_EVENTS_RUN_STATUS ?? "unknown";
		result.dryRun = process.env.GA_EVENTS_DRY_RUN === "true" || (Boolean(process.env.GITHUB_REF) && process.env.GITHUB_REF !== "refs/heads/master");
		if (result.dryRun) {
			result.publicationSkipped = "dry run 또는 master 외 ref에서는 PR 게시를 생략합니다";
		}
		if (result.runStatus === "failure") {
			result.previousStatus = result.status;
			result.status = "failed";
			result.error ??= "워크플로 단계 실패: Actions 로그를 확인하세요";
		}
		write("result", result);
		if (process.env.GITHUB_STEP_SUMMARY) {
			appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 주간 GA 이벤트 누락 점검\n\n결과: ${result.status}\n\n실행 상태: ${result.runStatus}\n\n진단: ${result.error ?? "없음"}\n\nDry run: ${result.dryRun}\n\n게시 생략: ${result.publicationSkipped ?? "없음"}\n\n세부 결과는 JSON 아티팩트를 확인하세요.\n`);
		}
	},
};

try {
	const command = process.argv[2];
	if (!Object.hasOwn(commands, command)) {
		fail("알 수 없는 GA 이벤트 점검 명령입니다");
	}
	commands[command]();
} catch (error) {
	const message = error.isSafe === true ? error.message : "입력 JSON·파일을 읽거나 처리하지 못했습니다";
	write("result", { status: "failed", stage: Object.hasOwn(commands, process.argv[2]) ? process.argv[2] : "unknown", error: message });
	console.error(message);
	process.exitCode = 1;
}
