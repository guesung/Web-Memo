import { execFileSync } from "node:child_process";
import { lstatSync } from "node:fs";

/** 한 번의 실행이 추가할 수 있는 이벤트 수. 이벤트는 나중에 더하기 쉽지만 잘못 쌓인 데이터는 지울 수 없습니다. */
export const MAX_EVENTS = 2;
const MAX_FILES = 12;
const MAX_CHANGED_LINES = 300;

/** 이벤트 유니온과 분류 표가 있는 파일. 새 이벤트마다 반드시 바뀝니다. */
export const TYPE_FILE = "packages/shared/src/modules/analytics/type.ts";
/** 이벤트를 설명하는 문서. 새 이벤트마다 같이 바뀌어야 합니다. */
export const DOC_FILES = ["docs/events.md", "docs/analytics.md"];

const SOURCE_PREFIXES = ["apps/web/src/", "apps/chrome-extension/src/", "pages/", "packages/shared/src/"];
const EVENT_NAME = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
// 이메일·이름·입력 원문은 속성으로 보내지 않습니다 (docs/events.md 금지 속성)
const FORBIDDEN_PROPERTY = /^(email|name|user_name|phone|token|password|query|keyword|content|memo|text|message|note|url)$/;
const FORBIDDEN_CODE = /\b(?:eval|child_process|process\.env|XMLHttpRequest|dangerouslySetInnerHTML)\b|\bfetch\(/;

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

const fail = (message) => {
	throw Object.assign(new Error(message), { isSafe: true });
};

/** 이벤트 유니온 소스에서 `name: "..."` 리터럴을 모두 뽑습니다. */
export const extractEventNames = (source) => [...source.matchAll(/\bname:\s*"([a-z][a-z0-9_]*)"/g)].map((match) => match[1]);

/** 이 스크립트가 고칠 수 있는 제품 소스인지 (테스트·타입 파일 제외) 판정합니다. */
export const isSourceFile = (file) => /^[a-zA-Z0-9_./()[\]+-]+$/.test(file) && !file.split("/").includes("..") && SOURCE_PREFIXES.some((prefix) => file.startsWith(prefix)) && /\.tsx?$/.test(file) && !/\.test\./.test(file) && file !== TYPE_FILE;

/** 모델이 반환한 후보를 제한된 스키마로 검사합니다. */
export const validateCandidate = (candidate, { existingEvents, trackedFiles }) => {
	const keys = ["status", "reason", "events"];
	if (!candidate || Object.keys(candidate).sort().join() !== [...keys].sort().join() || !["gap", "none"].includes(candidate.status)) {
		fail("후보 스키마가 올바르지 않습니다");
	}
	if (typeof candidate.reason !== "string" || !candidate.reason.trim() || candidate.reason.length > 3000 || !Array.isArray(candidate.events)) {
		fail("후보 근거가 없습니다");
	}
	if (candidate.status === "none") {
		if (candidate.events.length) {
			fail("누락이 없는 결과에는 이벤트를 지정할 수 없습니다");
		}

		return candidate;
	}
	if (!candidate.events.length || candidate.events.length > MAX_EVENTS) {
		fail(`이벤트는 1~${MAX_EVENTS}개여야 합니다`);
	}
	const existing = new Set(existingEvents);
	const names = new Set();
	for (const event of candidate.events) {
		if (!event || Object.keys(event).sort().join() !== ["name", "category", "trigger", "question", "properties", "files"].sort().join()) {
			fail("이벤트 스키마가 올바르지 않습니다");
		}
		if (!EVENT_NAME.test(event.name) || event.name.length > 40 || existing.has(event.name) || names.has(event.name)) {
			fail("이벤트 이름이 규칙에 어긋나거나 이미 있습니다");
		}
		names.add(event.name);
		if (!["engagement", "core_action"].includes(event.category)) {
			fail("이벤트 분류가 올바르지 않습니다");
		}
		for (const key of ["trigger", "question"]) {
			if (typeof event[key] !== "string" || !event[key].trim() || event[key].length > 500) {
				fail("발생 시점과 답하려는 질문이 필요합니다");
			}
		}
		if (!Array.isArray(event.properties) || event.properties.length > 5 || !event.properties.every((key) => EVENT_NAME.test(key) && !FORBIDDEN_PROPERTY.test(key))) {
			fail("속성 이름이 규칙에 어긋나거나 금지 속성입니다");
		}
		if (!Array.isArray(event.files) || !event.files.length || event.files.length > 5 || !event.files.every((file) => isSourceFile(file) && trackedFiles.includes(file))) {
			fail("이벤트를 심을 파일은 실제 추적 중인 제품 소스여야 합니다");
		}
	}

	return candidate;
};

const addedLines = (diff) => diff.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"));
const removedLines = (diff) => diff.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---"));
const sameSet = (left, right) => left.size === right.size && [...left].every((item) => right.has(item));

/** 기존 파일 수정만으로 후보의 이벤트를 정확히 심었는지 검사합니다. */
export const validateChanges = ({ baseSha, candidate }) => {
	if (!/^[a-f0-9]{40}$/.test(baseSha ?? "")) {
		fail("GA_EVENTS_BASE_SHA는 전체 커밋 SHA여야 합니다");
	}
	if (candidate.status !== "gap") {
		fail("누락이 확인된 후보만 변경할 수 있습니다");
	}
	const untracked = run("git", ["ls-files", "--others", "--exclude-standard"]);
	const changes = run("git", ["diff", "--name-status", "--no-renames", baseSha, "--"]).split("\n").filter(Boolean).map((line) => line.split("\t"));
	if (untracked || !changes.length || changes.some(([status]) => status !== "M")) {
		fail("기존 파일 수정만 허용되며 새 파일·삭제는 허용되지 않습니다");
	}
	const files = changes.map(([, file]) => file);
	const allowedSources = new Set(candidate.events.flatMap((event) => event.files));
	if (files.length > MAX_FILES || !files.includes(TYPE_FILE) || !DOC_FILES.every((file) => files.includes(file))) {
		fail("이벤트 유니온과 두 문서가 함께 바뀌어야 합니다");
	}
	for (const file of files) {
		if (lstatSync(file).isSymbolicLink() || (file !== TYPE_FILE && !DOC_FILES.includes(file) && (!isSourceFile(file) || !allowedSources.has(file)))) {
			fail("후보가 지정하지 않은 파일은 변경할 수 없습니다");
		}
	}
	const changedLines = run("git", ["diff", "--numstat", baseSha, "--"]).split("\n").filter(Boolean).reduce((sum, line) => sum + Number(line.split("\t")[0]) + Number(line.split("\t")[1]), 0);
	if (!(changedLines <= MAX_CHANGED_LINES)) {
		fail(`변경이 ${MAX_CHANGED_LINES}줄을 넘습니다`);
	}

	const expected = new Set(candidate.events.map((event) => event.name));
	const typeDiff = run("git", ["diff", "-U0", baseSha, "--", TYPE_FILE]);
	if (removedLines(typeDiff).some((line) => /\bname:\s*"/.test(line) || /^-\s*[a-z0-9_]+:\s*"(?:engagement|core_action)"/.test(line))) {
		fail("기존 이벤트 정의를 지우거나 바꿀 수 없습니다");
	}
	const unionNames = new Set(addedLines(typeDiff).flatMap((line) => extractEventNames(line)));
	const categories = new Map(addedLines(typeDiff).flatMap((line) => [...line.matchAll(/^\+\s*([a-z0-9_]+):\s*"(engagement|core_action)"/g)].map((match) => [match[1], match[2]])));
	if (!sameSet(unionNames, expected) || !sameSet(new Set(categories.keys()), expected) || candidate.events.some((event) => categories.get(event.name) !== event.category)) {
		fail("type.ts에 추가된 이벤트와 분류가 후보와 다릅니다");
	}

	const callSites = new Set();
	for (const file of files.filter(isSourceFile)) {
		const lines = addedLines(run("git", ["diff", "-U0", baseSha, "--", file]));
		if (lines.some((line) => FORBIDDEN_CODE.test(line))) {
			fail("이벤트 전송 외의 위험한 코드가 포함됐습니다");
		}
		for (const name of lines.flatMap((line) => extractEventNames(line))) {
			if (!expected.has(name)) {
				fail("후보에 없는 이벤트를 호출했습니다");
			}
			callSites.add(name);
		}
	}
	if (!sameSet(callSites, expected)) {
		fail("모든 후보 이벤트에 호출 위치가 있어야 합니다");
	}
	for (const file of DOC_FILES) {
		const text = addedLines(run("git", ["diff", "-U0", baseSha, "--", file])).join("\n");
		if ([...expected].some((name) => !text.includes(name))) {
			fail(`${file}에 모든 새 이벤트가 기록돼야 합니다`);
		}
	}

	return files;
};
