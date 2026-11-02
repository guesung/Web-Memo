import { notifySlackSafely } from "./api";
import { GITHUB_DEFAULT_BRANCH, GITHUB_REPOSITORY } from "./config";
import { DEPLOY_TARGET_LABELS, dispatchRelease } from "./github";
import {
	fetchDefaultBranchSha,
	GithubApiError,
	requestGithub,
} from "./githubApi";
import {
	BUMP_KINDS,
	bumpVersion,
	compareSemver,
	parseSemver,
	type TBumpKind,
} from "./version";
import {
	createBumpCommit,
	fetchVersionForBump,
	type TVersionTrack,
} from "./versionBump";

/**
 * Slack "버전 올려 배포" 메뉴로 다음 버전 PR을 원하는 버전으로 맞춰 머지하고 배포합니다.
 *
 * 흐름: 게이트 3개(반려 시 GitHub 쓰기 0회) → `chore/next-version-<트랙>` 브랜치를 master 위
 * 커밋 1개로 force 갱신 → PR 열기/제목 갱신 → merge → 머지 커밋으로 release.yml dispatch.
 */

/** 메뉴 option value. `.github/scripts/shared/slack-blocks.mjs`의 buildBumpSelect가 만듭니다. */
export interface IFBumpSelection {
	target: TVersionTrack;
	/** 버튼을 만든 빌드의 커밋 SHA */
	ref: string;
	bump: TBumpKind;
	/** 메뉴에 표시한 결과 버전 */
	version: string;
}

/** 클릭한 사람에게 그대로 보여줄 반려 사유. GitHub 쓰기를 하기 전이거나 단계가 어디인지 문구에 담긴 실패입니다. */
class BumpRejection extends Error {}

const TRACK_NAMES: Record<TVersionTrack, string> = {
	extension: "확장",
	app: "앱",
};

export const buildNextVersionBranch = (track: TVersionTrack): string =>
	`chore/next-version-${track}`;

export const buildNextVersionPrTitle = ({
	track,
	version,
}: {
	track: TVersionTrack;
	version: string;
}): string => `chore: ${TRACK_NAMES[track]} 버전을 ${version}로 올린다`;

const PR_MERGE_WARNING =
	"직접 머지하지 마세요. Slack에서 버전 올려 배포를 고르면 이 PR이 머지되고 배포됩니다.";

/**
 * option value를 검증된 타입으로 바꿉니다. 경계에서 한 번만 검증하고 안쪽은 이 타입만 받습니다.
 *
 * @param actionId 메뉴의 action_id. value의 target과 어긋나면 반려합니다 — 다른 트랙 파일이 고쳐지는 걸 막습니다.
 */
export const parseBumpSelection = ({
	actionId,
	value,
}: {
	actionId: string;
	value: unknown;
}): IFBumpSelection => {
	let raw: unknown;

	try {
		raw = typeof value === "string" ? JSON.parse(value) : undefined;
	} catch {
		raw = undefined;
	}

	const candidate = raw as Partial<IFBumpSelection> | undefined;

	if (
		(candidate?.target !== "extension" && candidate?.target !== "app") ||
		typeof candidate.ref !== "string" ||
		candidate.ref.length === 0 ||
		!BUMP_KINDS.includes(candidate.bump as TBumpKind) ||
		typeof candidate.version !== "string" ||
		!parseSemver(candidate.version)
	) {
		throw new Error("버전 선택 값을 읽지 못했습니다");
	}

	if (actionId !== `deploy_bump_${candidate.target}`) {
		throw new Error("버전 선택 값의 대상이 메뉴와 맞지 않습니다");
	}

	return candidate as IFBumpSelection;
};

/** 게이트 ①②③. 통과하면 master 정보를 돌려주고, 아니면 BumpRejection을 던집니다. */
const checkGates = async (
	selection: IFBumpSelection,
): Promise<{ baseSha: string; masterVersion: string }> => {
	const { target, ref, bump, version } = selection;
	const [shaResult, versionResult] = await Promise.allSettled([
		fetchDefaultBranchSha(),
		fetchVersionForBump(target),
	]);

	if (shaResult.status === "rejected") {
		throw new BumpRejection(
			"master의 최신 커밋을 확인하지 못했습니다 — 잠시 뒤 다시 시도하세요",
		);
	}

	// ① 과거 빌드 위에 버전 PR을 머지하면 배포 내용과 master 트리가 갈립니다.
	if (ref !== shaResult.value) {
		throw new BumpRejection("최신 master 빌드에서만 버전을 올릴 수 있습니다");
	}

	// 현재 버전을 모르는 채로 머지하느니 다시 시도하게 합니다.
	if (versionResult.status === "rejected") {
		throw new BumpRejection(
			`현재 ${TRACK_NAMES[target]} 버전을 확인하지 못했습니다 — 잠시 뒤 다시 시도하세요`,
		);
	}

	const masterVersion = versionResult.value;
	const master = parseSemver(masterVersion);

	if (!master) {
		throw new BumpRejection(
			`master의 ${TRACK_NAMES[target]} 버전(${masterVersion})이 semver 형식이 아닙니다`,
		);
	}

	// ② 메뉴를 만든 뒤 master 버전이 바뀌었다면 메뉴에 보인 결과 버전은 더 이상 맞지 않습니다.
	if (bumpVersion(masterVersion, bump) !== version) {
		throw new BumpRejection(
			`표시된 버전(${version})이 바뀌었습니다 — 현재 master ${masterVersion} 기준 ${bump}는 ${bumpVersion(masterVersion, bump)}입니다. 새 빌드 메시지에서 다시 골라 주세요`,
		);
	}

	// ③ 위 계산이 같으면 항상 참이지만, 배포 취소가 안 되는 경로라 값 자체를 한 번 더 확인합니다.
	if (compareSemver(parseSemver(version) ?? [0, 0, 0], master) <= 0) {
		throw new BumpRejection(
			`선택한 버전(${version})이 master 버전(${masterVersion})보다 커야 합니다`,
		);
	}

	return { baseSha: shaResult.value, masterVersion };
};

interface IFOpenPr {
	number: number;
}

/** GitHub 단계 하나를 실행하고, 실패하면 단계 이름과 GitHub의 message를 담아 반려합니다. */
const runStep = async <T>(step: string, task: () => Promise<T>): Promise<T> => {
	try {
		return await task();
	} catch (error) {
		console.error(`다음 버전 PR ${step} 실패:`, error);

		throw new BumpRejection(
			`${step} 실패: ${error instanceof GithubApiError ? error.githubMessage : error instanceof Error ? error.message : String(error)}`,
		);
	}
};

const findOpenPr = async (branch: string): Promise<IFOpenPr | undefined> => {
	const owner = GITHUB_REPOSITORY.split("/")[0];
	const prs = await requestGithub<IFOpenPr[]>(
		`/pulls?head=${encodeURIComponent(`${owner}:${branch}`)}&state=open`,
	);

	return prs[0];
};

/**
 * 브랜치를 커밋으로 맞춥니다. 열린 PR이 있으면 브랜치도 있으므로 force 갱신만 하고,
 * 없으면 새로 만듭니다. 머지된 PR이 남긴 옛 브랜치가 있으면(422) 같은 force 갱신으로 되돌립니다.
 */
const pointBranchAt = async ({
	branch,
	commitSha,
	branchExists,
}: {
	branch: string;
	commitSha: string;
	branchExists: boolean;
}): Promise<void> => {
	const updateBranch = () =>
		requestGithub(`/git/refs/heads/${branch}`, {
			method: "PATCH",
			body: { sha: commitSha, force: true },
		});

	if (branchExists) {
		await updateBranch();

		return;
	}

	try {
		await requestGithub("/git/refs", {
			method: "POST",
			body: { ref: `refs/heads/${branch}`, sha: commitSha },
		});
	} catch (error) {
		if (error instanceof GithubApiError && error.status === 422) {
			await updateBranch();

			return;
		}

		throw error;
	}
};

/**
 * 게이트를 통과한 선택을 PR 머지 → 배포까지 진행합니다.
 *
 * @returns 머지 커밋 SHA와 PR 번호. 머지 이후 dispatch 실패는 `dispatchError`로 따로 돌려줍니다 —
 *   머지는 이미 끝나 있어서 "아무것도 안 바뀐 실패"와 구분해 알려야 합니다.
 */
const mergeAndDeploy = async (
	selection: IFBumpSelection,
	gates: { baseSha: string; masterVersion: string },
): Promise<{ prNumber: number; mergeSha: string; dispatchError?: string }> => {
	const { target, version } = selection;
	const branch = buildNextVersionBranch(target);
	const title = buildNextVersionPrTitle({ track: target, version });

	const openPr = await runStep("열린 PR 조회", () => findOpenPr(branch));

	// 메시지는 PR 제목과 같게 둡니다. 부모는 게이트를 통과한 master HEAD 하나뿐이라 PR에는 버전 한 줄만 남습니다.
	const commitSha = await runStep("버전 커밋 생성", () =>
		createBumpCommit({
			bumps: [
				{
					track: target,
					version,
					expectedCurrentVersion: gates.masterVersion,
				},
			],
			message: title,
			baseCommitSha: gates.baseSha,
		}),
	);

	await runStep("브랜치 갱신", () =>
		pointBranchAt({ branch, commitSha, branchExists: Boolean(openPr) }),
	);

	// PR 생성은 브랜치가 master와 달라야 해서 커밋을 올린 뒤에 합니다.
	const pr = openPr
		? await runStep("PR 제목 갱신", async () => {
				await requestGithub(`/pulls/${openPr.number}`, {
					method: "PATCH",
					body: { title },
				});

				return openPr;
			})
		: await runStep("PR 생성", () =>
				requestGithub<IFOpenPr>("/pulls", {
					method: "POST",
					body: {
						title,
						head: branch,
						base: GITHUB_DEFAULT_BRANCH,
						body: `## 설명\n\n${PR_MERGE_WARNING}\n`,
					},
				}),
			);

	// sha를 실어 방금 올린 커밋이 아닌 head는 머지하지 않게 합니다(그 사이 브랜치가 바뀌면 409).
	const merged = await runStep(`PR #${pr.number} 머지`, () =>
		requestGithub<{ sha: string }>(`/pulls/${pr.number}/merge`, {
			method: "PUT",
			body: { merge_method: "merge", sha: commitSha },
		}),
	);

	try {
		await dispatchRelease({ targets: [target], ref: merged.sha });
	} catch (error) {
		console.error("다음 버전 PR 머지 뒤 배포 실행 실패:", error);

		return {
			prNumber: pr.number,
			mergeSha: merged.sha,
			dispatchError:
				error instanceof Error ? error.message.slice(0, 150) : String(error),
		};
	}

	return { prNumber: pr.number, mergeSha: merged.sha };
};

/**
 * "버전 올려 배포" 한 건을 처리하고 결과를 response_url로 알립니다. 던지지 않습니다.
 *
 * @description 3초 안에 끝나지 않아 `runAfterResponse` 안에서 호출합니다. 알림은 기존 배포 알림과
 * 같이 새 메시지로 보냅니다(replace_original 없음) — 원본 메시지를 바꾸면 다른 배포 버튼이 사라집니다.
 * 준비 중 표시와 반려는 본인에게만, 시작 알림은 채널에 보입니다.
 */
export const handleBumpDeploy = async ({
	selection,
	responseUrl,
	userId,
}: {
	selection: IFBumpSelection;
	responseUrl: string;
	userId: string;
}): Promise<void> => {
	const label = `${DEPLOY_TARGET_LABELS[selection.target]} ${selection.version}`;

	await notifySlackSafely({
		responseUrl,
		isEphemeral: true,
		text: `⏳ ${label} 준비 중…`,
	});

	try {
		const gates = await checkGates(selection);
		const { prNumber, mergeSha, dispatchError } = await mergeAndDeploy(
			selection,
			gates,
		);
		const prUrl = `https://github.com/${GITHUB_REPOSITORY}/pull/${prNumber}`;

		if (dispatchError) {
			await notifySlackSafely({
				responseUrl,
				text: [
					`⚠️ <@${userId}> 님의 ${label} 배포를 시작하지 못했습니다 — ${dispatchError}`,
					`머지는 완료됨 · 배포 버튼으로 다시 시도하세요 (<${prUrl}|PR #${prNumber}>, 머지 커밋 \`${mergeSha.slice(0, 7)}\`)`,
				].join("\n"),
			});

			return;
		}

		await notifySlackSafely({
			responseUrl,
			text: [
				`🚀 ${label} 배포를 시작했습니다 (<@${userId}> 님 요청)`,
				`<${prUrl}|PR #${prNumber}> 머지 커밋 \`${mergeSha.slice(0, 7)}\``,
				`<https://github.com/${GITHUB_REPOSITORY}/actions/workflows/release.yml|워크플로 보기>`,
			].join("\n"),
		});
	} catch (error) {
		console.error("버전 올려 배포 반려:", error);

		await notifySlackSafely({
			responseUrl,
			isEphemeral: true,
			text: `⚠️ ${label} 배포를 시작하지 못했습니다 — ${error instanceof BumpRejection ? error.message : "알 수 없는 오류가 났습니다. 잠시 뒤 다시 시도하세요"}`,
		});
	}
};
