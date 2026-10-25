/**
 * knip이 "어디서도 import되지 않는다"고 판정한 파일을 안전/회색으로 가르고,
 * 정리 PR 본문을 만듭니다.
 *
 * cleanup-unused-files.mjs가 씁니다. 분류 규칙을 여기 모아둔 이유는
 * 스크립트를 돌리지 않고도 규칙만 따로 테스트할 수 있게 하기 위해서입니다.
 */

import { execFileSync } from "node:child_process";
import { basename, extname } from "node:path";

/** 한 PR이 다루는 최대 삭제 항목 수. 리뷰를 5분 안에 끝낼 수 있는 선입니다. */
export const MAX_DELETIONS = 10;

/** 자동 정리 PR을 식별하는 라벨. 열려 있으면 다음 실행이 아무것도 하지 않습니다. */
export const CLEANUP_LABEL = "chore/auto-cleanup";

/** 지워도 되는지를 검증 게이트가 보장할 수 있는 확장자만 후보가 됩니다. */
const SAFE_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * 검증 그래프 밖이거나, import 그래프에 없어도 살아있는 경로들입니다.
 *
 * knip.jsonc의 ignore와 겹치지만 여기서 한 번 더 겁니다. knip 설정이 바뀌어도
 * 삭제가 이 경계를 넘지 않아야 하고, 경계를 넘은 후보가 조용히 사라지는 대신
 * 회색 목록에 사유와 함께 남아야 합니다.
 */
const EXCLUDED_PREFIXES = [
	"scripts/",
	".github/",
	"packages/supabase-edge-functions/",
];

const EXCLUDED_SEGMENTS = ["/public/", "/_locales/", "/dist/", "/assets/"];

/**
 * 프레임워크가 규약으로 로드하는 파일들. import가 없어도 살아 있습니다.
 * knip 설정이 entry로 잡고 있지만, 설정이 어긋났을 때를 대비한 이중 방어입니다.
 */
const FRAMEWORK_FILE_NAMES = new Set([
	"page",
	"layout",
	"route",
	"template",
	"loading",
	"error",
	"not-found",
	"default",
	"middleware",
	"sitemap",
	"robots",
	"manifest",
	"instrumentation",
]);

/**
 * 소스 파일이 아닌, 문자열 경로 참조가 실제로 사는 곳들입니다.
 *
 * TS끼리의 참조는 knip이 이미 정적으로 봤습니다. 여기서 찾는 것은 knip이
 * 볼 수 없는 쪽 — 빌드 스크립트(`resolve(dir, "entry.ts")`), 설정 JSON,
 * 워크플로 YAML, 문서에 적힌 경로입니다.
 */
const DYNAMIC_REFERENCE_GLOBS = [
	"*.mjs",
	"*.js",
	"*.cjs",
	"*.json",
	"*.jsonc",
	"*.yml",
	"*.yaml",
	"*.sh",
	"*.md",
];

/**
 * 참조 검색에서 빼는 파일들 — 이 자동화 자신입니다.
 *
 * 아래 주석과 설명 문구에 예시로 적힌 파일명이 그대로 매치가 됩니다.
 * 빼지 않으면 두 방향으로 틀립니다.
 * - 주석에 이름이 적힌 파일이 "참조됨"으로 오인돼 영영 회색에 갇힙니다
 * - 반대로 누가 그 주석의 예시 이름을 바꾸면 그 파일이 안전으로 승격돼 지워집니다
 *
 * 분류 결과가 분류기의 주석 한 줄에 매달리면 안 됩니다.
 */
const SELF_REFERENCE_PATHS = new Set([
	".github/scripts/cleanup/cleanup-report.mjs",
	".github/scripts/cleanup/cleanup-unused-files.mjs",
]);

/**
 * 추적 중인 파일에서 패턴을 찾습니다. 후보 자신과 이 자동화 자신은 결과에서 뺍니다.
 *
 * git grep을 쓰는 이유: .gitignore를 자동으로 존중하므로 node_modules·dist를
 * 따로 거르지 않아도 되고, 워크플로 러너에도 반드시 있습니다.
 */
const findReferences = ({ pattern, candidatePath, pathspecs }) => {
	try {
		const args = ["grep", "--fixed-strings", "--name-only", pattern];

		if (pathspecs?.length) {
			args.push("--", ...pathspecs);
		}

		const output = execFileSync("git", args, { encoding: "utf8" });

		return output
			.split("\n")
			.map((line) => line.trim())
			.filter(
				(line) =>
					line && line !== candidatePath && !SELF_REFERENCE_PATHS.has(line),
			);
	} catch {
		// git grep은 결과가 없으면 종료 코드 1로 끝납니다. 에러가 아닙니다.
		return [];
	}
};

/**
 * 회색 사유에 적을 참조처 요약.
 *
 * 첫 매치만 적으면 알파벳 순으로 앞선 문서가 뽑혀, 리뷰어가 그 경로를 열었을 때
 * 진짜 이유(빌드 스크립트의 문자열 경로)가 안 보입니다. 최대 두 곳과 총 건수를 적습니다.
 */
const summarizeReferences = (matches, pattern) => {
	const [first, second] = matches;
	const shown = second ? `${first}, ${second}` : first;
	const rest = matches.length > 2 ? ` 외 ${matches.length - 2}곳` : "";

	return `${shown}${rest} 에서 "${pattern}" 문자열로 참조 (총 ${matches.length}곳)`;
};

/**
 * 이 파일이 문자열 경로로 참조되고 있는가.
 *
 * 두 가지를 봅니다.
 * 1. 확장자까지 포함한 파일명(`entry.ts`)이 아무 데서나 나오는가
 * 2. 확장자를 뗀 이름(`DebugCache`)이 소스가 아닌 파일에서 나오는가
 *
 * 2번을 소스 밖으로 한정한 이유: TS 안에서의 참조는 knip이 이미 봤고,
 * 여기까지 열어두면 흔한 이름(`index`)이 전부 걸려 후보가 남지 않습니다.
 */
const findDynamicReference = (candidatePath) => {
	const fileName = basename(candidatePath);
	const stem = basename(candidatePath, extname(candidatePath));

	const byFileName = findReferences({
		pattern: fileName,
		candidatePath,
	});

	if (byFileName.length > 0) {
		return summarizeReferences(byFileName, fileName);
	}

	const byStem = findReferences({
		pattern: stem,
		candidatePath,
		pathspecs: DYNAMIC_REFERENCE_GLOBS,
	});

	if (byStem.length > 0) {
		return summarizeReferences(byStem, stem);
	}

	return null;
};

/**
 * 후보 하나를 판정합니다. 회색이면 사유를, 안전이면 null을 돌려줍니다.
 *
 * 판정이 서지 않으면 항상 회색입니다. 자동 삭제의 거짓 양성은 수동 확인의
 * 비용보다 훨씬 비쌉니다 — 한 번 잘못 지우면 자동화 자체를 다시 안 보게 됩니다.
 */
export const findGrayReason = (candidatePath) => {
	const extension = extname(candidatePath);

	if (!SAFE_EXTENSIONS.has(extension)) {
		return `검증 게이트가 보장하지 못하는 확장자(${extension || "없음"})`;
	}

	const excludedPrefix = EXCLUDED_PREFIXES.find((prefix) =>
		candidatePath.startsWith(prefix),
	);

	if (excludedPrefix) {
		return `검증 그래프 밖 경로(${excludedPrefix})`;
	}

	const excludedSegment = EXCLUDED_SEGMENTS.find((segment) =>
		`/${candidatePath}`.includes(segment),
	);

	if (excludedSegment) {
		return `정적 자산·산출물 경로(${excludedSegment})`;
	}

	if (FRAMEWORK_FILE_NAMES.has(basename(candidatePath, extension))) {
		return "프레임워크 규약 파일 — import 없이 로드됨";
	}

	return findDynamicReference(candidatePath);
};

/**
 * knip이 낸 파일 목록을 안전/회색으로 가릅니다.
 *
 * 안전 목록은 MAX_DELETIONS까지만 잘리고, 잘린 나머지는 버리지 않고
 * 회색으로 옮겨 다음 회차에 다시 후보가 됩니다.
 */
export const classifyCandidates = (candidatePaths) => {
	const safe = [];
	const gray = [];

	for (const candidatePath of candidatePaths) {
		const reason = findGrayReason(candidatePath);

		if (reason) {
			gray.push({ path: candidatePath, reason });
			continue;
		}

		safe.push(candidatePath);
	}

	const selected = safe.slice(0, MAX_DELETIONS);

	for (const deferred of safe.slice(MAX_DELETIONS)) {
		gray.push({
			path: deferred,
			reason: `이번 회차 상한(${MAX_DELETIONS}건) 초과 — 다음 회차 후보`,
		});
	}

	return { safe: selected, gray };
};

/** 항목 하나를 지운 커밋의 메시지. 레포 커밋 컨벤션(docs/commit-convention.md)을 따릅니다. */
export const buildCommitMessage = (candidatePath) =>
	`chore: 미사용 파일 ${candidatePath} 를 제거한다`;

const formatGraySection = (gray) => {
	if (gray.length === 0) {
		return "없음";
	}

	return gray
		.map((item) => `- \`${item.path}\` — ${item.reason}`)
		.join("\n");
};

/**
 * PR 본문. 리뷰 시간을 5분으로 줄이는 유일한 장치이므로, 항목마다
 * "무엇을 / 왜 안전하다고 판단했는지 / 어떤 도구가 그렇게 말했는지"를 적습니다.
 */
export const buildPrBody = ({ deleted, gray, verification, knipVersion }) => {
	const deletedSection = deleted
		.map(
			(item) =>
				`- \`${item.path}\`\n` +
				`  - 근거: knip ${knipVersion} 이 "어디서도 import되지 않음"으로 보고\n` +
				`  - 추가 확인: 파일명·확장자 문자열 참조 0건 (git grep)\n` +
				`  - 커밋: ${item.commit}`,
		)
		.join("\n");

	const verificationSection = verification
		.map((step) => `- ${step.passed ? "통과" : "실패"} — \`${step.command}\``)
		.join("\n");

	return [
		"## 무엇을 했나",
		"",
		`knip이 찾은 미사용 파일 ${deleted.length}건을 제거했습니다. 항목마다 커밋이 하나씩이라 문제가 되는 것만 골라 되돌릴 수 있습니다.`,
		"",
		"## 삭제한 파일",
		"",
		deletedSection || "없음",
		"",
		"## 검증",
		"",
		verificationSection,
		"",
		"검증이 전부 통과했을 때만 이 PR이 열립니다. 중간에 깨진 항목은 되돌려 아래 회색 목록으로 내려갑니다.",
		"",
		"## 사람이 봐야 할 목록 (회색)",
		"",
		"자동으로 지우지 않은 것들입니다. 판정이 서지 않아 남겨둔 것이지 \"지우면 안 된다\"는 뜻은 아닙니다.",
		"",
		formatGraySection(gray),
		"",
		"## 재현",
		"",
		"```bash",
		"pnpm knip",
		"```",
	].join("\n");
};
