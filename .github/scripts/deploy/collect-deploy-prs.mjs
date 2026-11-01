/**
 * 이번 배포에 들어간 PR을 모읍니다. record-deploy.mjs가 가져다 씁니다(단독 실행 없음).
 *
 * 범위는 "직전에 기록한 배포 SHA..이번 ref"입니다. 그 사이 master의 PR 머지 커밋마다
 * detect-affected-apps.sh로 "이 PR이 이 타깃에 영향을 줬는지"를 판정해, 영향 준 PR만
 * 남깁니다. 타깃별 배포는 서로 다른 시점에 일어나므로 PR 귀속을 타깃마다 따로 합니다.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMergeSource } from "../shared/run-context.mjs";

const DETECT_SCRIPT = join(
	dirname(fileURLToPath(import.meta.url)),
	"detect-affected-apps.sh",
);

/** 다음 버전 PR(`chore/next-version-*`)은 배포 내용이 아니라 버전 올리기라 제외합니다. */
const NEXT_VERSION_BRANCH_PATTERN = /(^|\/)chore\/next-version-/;

export const RANGE = {
	first: "first",
	same: "same",
	rollback: "rollback",
	forward: "forward",
	diverged: "diverged",
};

const git = (args, cwd) =>
	execFileSync("git", args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();

const resolveCommit = (ref, cwd) => {
	try {
		return git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], cwd);
	} catch {
		return null;
	}
};

const isAncestor = (ancestor, descendant, cwd) => {
	try {
		execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
			cwd,
			stdio: "ignore",
		});

		return true;
	} catch {
		// 종료 코드 1은 "조상 아님"입니다. 그 외 오류도 조상이 아닌 것으로 보면
		// diverged로 떨어져 PR 목록 없이 기록되므로, 틀린 목록이 남지는 않습니다.
		return false;
	}
};

/**
 * 직전 기록 SHA와 이번 ref의 관계를 분류합니다.
 *
 * 직전 SHA가 이 클론에 없으면(force-push 등) 관계를 알 수 없으므로 diverged입니다.
 *
 * @param {{ previousSha: string | null | undefined, ref: string, cwd?: string }} params
 * @returns {{ kind: string, refSha: string, previousSha: string | null }}
 */
export const classifyRange = ({ previousSha, ref, cwd }) => {
	const refSha = resolveCommit(ref, cwd);

	if (!refSha) {
		throw new Error(`배포 ref(${ref})를 해석할 수 없습니다`);
	}

	if (!previousSha) {
		return { kind: RANGE.first, refSha, previousSha: null };
	}

	const previous = resolveCommit(previousSha, cwd);

	if (!previous) {
		return { kind: RANGE.diverged, refSha, previousSha };
	}

	if (previous === refSha) {
		return { kind: RANGE.same, refSha, previousSha: previous };
	}

	if (isAncestor(refSha, previous, cwd)) {
		return { kind: RANGE.rollback, refSha, previousSha: previous };
	}

	if (isAncestor(previous, refSha, cwd)) {
		return { kind: RANGE.forward, refSha, previousSha: previous };
	}

	return { kind: RANGE.diverged, refSha, previousSha: previous };
};

/**
 * `git log --merges --first-parent --format=%H%x1f%s%x1f%b%x1e` 출력을 PR 목록으로 바꿉니다.
 * PR 머지 커밋이 아닌 것과 다음 버전 PR은 버립니다. 입력 순서(최신이 위)를 지킵니다.
 *
 * 제목은 GitHub이 머지 커밋 본문 첫 줄에 적는 PR 제목입니다. 본문이 비면 커밋 제목을 씁니다.
 */
export const parseMergeLog = (rawLog) =>
	rawLog
		.split("\u001e")
		.map((record) => record.replace(/^\n+/, ""))
		.filter((record) => record.trim())
		.flatMap((record) => {
			const [sha = "", subject = "", body = ""] = record.split("\u001f");
			const source = parseMergeSource(subject);

			if (!source || NEXT_VERSION_BRANCH_PATTERN.test(source.branch)) {
				return [];
			}

			const title =
				body
					.split("\n")
					.map((line) => line.trim())
					.find(Boolean) ?? subject.trim();

			return [
				{
					sha: sha.trim(),
					number: source.prNumber,
					title,
					branch: source.branch,
				},
			];
		});

const listMergedPrs = ({ previous, refSha, cwd }) =>
	parseMergeLog(
		git(
			[
				"log",
				"--merges",
				"--first-parent",
				"--format=%H%x1f%s%x1f%b%x1e",
				`${previous}..${refSha}`,
			],
			cwd,
		),
	);

/**
 * detect-affected-apps.sh를 BASE_REF=<머지>^1, HEAD_REF=<머지>로 돌려 앱별 영향을 읽습니다.
 * turbo는 현재 체크아웃의 패키지 그래프로 판정합니다(배포 ref를 체크아웃한 상태에서 호출).
 * 스크립트 실패는 던집니다 — 어떻게 다룰지는 호출한 쪽이 정합니다.
 *
 * @returns {{ app: boolean, extension: boolean, web: boolean }}
 */
export const detectAffectedByScript = ({ baseRef, headRef, cwd }) => {
	const scratch = mkdtempSync(join(tmpdir(), "detect-affected-"));
	const outputPath = join(scratch, "output");

	try {
		const result = spawnSync("bash", [DETECT_SCRIPT], {
			cwd,
			encoding: "utf8",
			env: {
				...process.env,
				BASE_REF: baseRef,
				HEAD_REF: headRef,
				GITHUB_OUTPUT: outputPath,
			},
		});

		if (result.status !== 0) {
			throw new Error(
				`영향 판정 실패(exit ${result.status}): ${(result.stderr || "").trim().slice(0, 300)}`,
			);
		}

		const values = Object.fromEntries(
			readFileSync(outputPath, "utf8")
				.split("\n")
				.filter(Boolean)
				.map((line) => line.split("=")),
		);

		return {
			app: values.app === "true",
			extension: values.extension === "true",
			web: values.web === "true",
		};
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
};

/**
 * @param {object} params
 * @param {string | null | undefined} params.previousSha 직전 기록 SHA(없으면 첫 배포)
 * @param {string} params.ref 이번 배포 ref
 * @param {"web" | "extension" | "app"} params.target
 * @param {string} [params.cwd] git 작업 디렉터리
 * @param {(args: { baseRef: string, headRef: string, cwd?: string }) => { app: boolean, extension: boolean, web: boolean }} [params.detectAffected]
 *   PR 하나의 영향 판정. 테스트에서 turbo 없이 돌리려고 주입합니다.
 * @returns {{ kind: string, refSha: string, previousSha: string | null, prs: Array<{ number: number, title: string, branch: string, sha: string }>, warnings: string[] }}
 */
export const collectDeployPrs = ({
	previousSha,
	ref,
	target,
	cwd,
	detectAffected = detectAffectedByScript,
}) => {
	const range = classifyRange({ previousSha, ref, cwd });
	const warnings = [];

	if (range.kind !== RANGE.forward) {
		return { ...range, prs: [], warnings };
	}

	const prs = listMergedPrs({
		previous: range.previousSha,
		refSha: range.refSha,
		cwd,
	}).filter((pr) => {
		try {
			// turbo의 TURBO_SCM_BASE가 `^1` 표기를 받는지 보장이 없어 풀어서 넘깁니다.
			return detectAffected({
				baseRef: git(["rev-parse", `${pr.sha}^1`], cwd),
				headRef: pr.sha,
				cwd,
			})[target];
		} catch (error) {
			// 판정을 못 했다고 PR을 조용히 빼면 배포 내용이 사라집니다. 넣어 두고 경고를 남깁니다.
			warnings.push(
				`#${pr.number} 영향 판정 실패, 목록에 포함: ${error.message}`,
			);

			return true;
		}
	});

	return { ...range, prs, warnings };
};
