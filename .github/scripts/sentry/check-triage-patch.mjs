#!/usr/bin/env node
/**
 * Claude 가 워킹트리에 남긴 변경을 결정적으로 검사합니다. (analyze 잡, 시크릿 없는 env)
 *
 * 금지 경로·파일 수·변경 줄 수를 어기면 패치를 통째로 폐기하고(워킹트리 원복) 사유를 남깁니다.
 * 통과하면 .sentry-triage/patch.diff 를 쓰고 이후 단계가 pnpm check 등을 돌립니다.
 *
 * 결과: .sentry-triage/patch-check.json { status: "none" | "rejected" | "ready", reasons, files, changedLines }
 * GITHUB_OUTPUT: patch_status
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { isMainModule } from "./triage-inputs.mjs";

export const MAX_FILES = 5;
export const MAX_CHANGED_LINES = 200;
const OUT_DIR = ".sentry-triage";

const SENSITIVE_WORDS = ["auth", "payment", "billing"];
const FORBIDDEN_PREFIXES = [
	".github/",
	".claude/",
	".agents/",
	".sentry-triage/",
	"packages/supabase-edge-functions/",
	"supabase/",
	"packages/env/",
];
const FORBIDDEN_BASENAMES = new Set([
	"manifest.js",
	"package.json",
	"pnpm-lock.yaml",
	"agents.md",
	"claude.md",
]);

/** 경로가 금지 대상이면 사유를, 아니면 null 을 돌려줍니다. */
export const findForbiddenReason = (path) => {
	const normalized = path.replace(/\\/g, "/");
	const lower = normalized.toLowerCase();
	const segments = lower.split("/");
	const basename = segments[segments.length - 1];

	if (normalized.startsWith("/") || segments.includes("..")) return "저장소 밖 경로";
	const prefix = FORBIDDEN_PREFIXES.find((value) => lower.startsWith(value));
	if (prefix) return `금지 경로(${prefix})`;
	if (segments.includes("migrations")) return "금지 경로(migrations)";
	if (segments.includes("node_modules")) return "금지 경로(node_modules)";
	if (FORBIDDEN_BASENAMES.has(basename)) return `금지 파일(${basename})`;
	if (basename.startsWith(".env")) return "금지 파일(.env*)";
	const word = SENSITIVE_WORDS.find((value) => lower.includes(value));
	if (word) return `인증·결제 관련 경로(${word})`;

	return null;
};

/**
 * 순수 판정.
 * @param {{ files: Array<{ path: string, added: number | null, deleted: number | null, mode: string }> }} params
 *   added/deleted 가 null 이면 바이너리입니다.
 */
export const evaluatePatch = ({ files }) => {
	if (files.length === 0) {
		return { status: "none", reasons: [], files: [], changedLines: 0 };
	}

	const reasons = [];
	let changedLines = 0;

	for (const file of files) {
		const forbidden = findForbiddenReason(file.path);
		if (forbidden) reasons.push(`${file.path}: ${forbidden}`);
		if (file.mode === "120000" || file.mode === "160000") {
			reasons.push(`${file.path}: 심볼릭 링크·서브모듈은 허용하지 않습니다`);
		}
		if (file.added === null || file.deleted === null) {
			reasons.push(`${file.path}: 바이너리 변경은 허용하지 않습니다`);
		} else {
			changedLines += file.added + file.deleted;
		}
	}
	if (files.length > MAX_FILES) {
		reasons.push(`변경 파일 ${files.length}개 > 상한 ${MAX_FILES}개`);
	}
	if (changedLines > MAX_CHANGED_LINES) {
		reasons.push(`변경 ${changedLines}줄 > 상한 ${MAX_CHANGED_LINES}줄`);
	}

	return {
		status: reasons.length > 0 ? "rejected" : "ready",
		reasons,
		files: files.map((file) => file.path),
		changedLines,
	};
};

/** `git diff --raw -z --no-renames` 출력: ":m1 m2 sha1 sha2 S\0path\0" 반복 */
export const parseRawZ = (output) => {
	const parts = output.split("\0").filter(Boolean);
	const result = [];
	for (let index = 0; index + 1 < parts.length; index += 2) {
		const meta = parts[index].split(" ");
		result.push({ path: parts[index + 1], mode: meta[4] === "D" ? meta[0].slice(1) : meta[1] });
	}

	return result;
};

/** `git diff --numstat -z --no-renames` 출력: "a\td\tpath\0" 반복 */
export const parseNumstatZ = (output) =>
	output
		.split("\0")
		.filter(Boolean)
		.map((record) => {
			const [added, deleted, ...rest] = record.split("\t");

			return {
				path: rest.join("\t"),
				added: added === "-" ? null : Number(added),
				deleted: deleted === "-" ? null : Number(deleted),
			};
		});

const git = (...args) =>
	execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const writeOutput = (status) => {
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `patch_status=${status}\n`);
	}
};

const main = () => {
	mkdirSync(OUT_DIR, { recursive: true });
	// 새 파일(회귀 테스트)도 diff 에 잡히도록 인덱스에 올리고, 컨텍스트 폴더는 다시 내립니다.
	// 워크플로가 .git/info/exclude 에 넣은 폴더를 pathspec 으로 지목하면 git add 가 exit 1 로 끝나므로
	// `:(exclude)` 대신 전체를 올린 뒤 reset 으로 뺍니다.
	git("add", "-A");
	git("reset", "--quiet", "--", OUT_DIR);

	const raw = parseRawZ(git("diff", "--cached", "--raw", "-z", "--no-renames"));
	const numstat = parseNumstatZ(git("diff", "--cached", "--numstat", "-z", "--no-renames"));
	const files = numstat.map((entry) => ({
		...entry,
		mode: raw.find((value) => value.path === entry.path)?.mode ?? "100644",
	}));

	const verdict = evaluatePatch({ files });

	if (verdict.status === "ready") {
		writeFileSync(`${OUT_DIR}/patch.diff`, git("diff", "--cached", "--binary", "--no-renames"));
	} else if (verdict.status === "rejected") {
		// 폐기: 이후 검증 단계가 금지된 변경 위에서 돌지 않도록 원복합니다.
		git("reset", "--hard", "--quiet", "HEAD");
		git("clean", "-fdq", "-e", OUT_DIR);
	}

	writeFileSync(`${OUT_DIR}/patch-check.json`, `${JSON.stringify(verdict, null, 2)}\n`);
	writeOutput(verdict.status);
	console.log(JSON.stringify(verdict));
};

if (isMainModule(import.meta.url)) {
	try {
		main();
	} catch (error) {
		console.error(`::error::${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
