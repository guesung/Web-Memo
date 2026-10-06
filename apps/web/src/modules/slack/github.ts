import { GITHUB_DEFAULT_BRANCH, GITHUB_REPOSITORY } from "./config";
import { buildHeaders, GITHUB_API_ORIGIN } from "./githubApi";

/** 배포 호출부가 사용하는 기본 브랜치 조회 진입점입니다. */
export { fetchDefaultBranchSha } from "./githubApi";
/** 기존 배포 호출부를 위한 버전 조회·커밋 진입점입니다. */
export {
	buildBumpCommitMessage,
	commitVersionBump,
	fetchCurrentVersionsForModal,
	fetchVersionForBump,
	type IFCurrentVersions,
	type TVersionTrack,
} from "./versionBump";

/** 배포 대상. release.yml의 boolean 입력 이름과 일대일로 대응합니다. */
export type TDeployTarget = "app" | "web" | "extension";

/** 배포 대상별 한글 라벨. Slack 메시지와 모달이 공유합니다. */
export const DEPLOY_TARGET_LABELS: Record<TDeployTarget, string> = {
	app: "📱 앱",
	web: "🌐 웹",
	extension: "🧩 확장",
};

/**
 * release.yml을 workflow_dispatch로 실행합니다.
 *
 * @description 워크플로는 항상 기본 브랜치(master)에서 실행하고, 실제로 체크아웃할
 * 커밋은 `ref` 입력으로 따로 넘깁니다. 워크플로 정의는 최신을 쓰면서 배포 대상만
 * 과거 커밋으로 되돌릴 수 있어야 하기 때문입니다.
 */
export const dispatchRelease = async ({
	targets,
	ref,
}: {
	targets: TDeployTarget[];
	ref: string;
}): Promise<void> => {
	const response = await fetch(
		`${GITHUB_API_ORIGIN}/repos/${GITHUB_REPOSITORY}/actions/workflows/release.yml/dispatches`,
		{
			method: "POST",
			headers: buildHeaders(),
			body: JSON.stringify({
				ref: GITHUB_DEFAULT_BRANCH,
				inputs: {
					app: String(targets.includes("app")),
					web: String(targets.includes("web")),
					extension: String(targets.includes("extension")),
					ref,
				},
			}),
		},
	);

	if (!response.ok) {
		throw new Error(
			`release.yml 실행 실패: ${response.status} ${await response.text()}`,
		);
	}
};

/** versions.yml을 실행해 배포 현황을 Slack 채널에 게시하게 합니다. */
export const dispatchVersionReport = async ({
	requestedBy,
}: {
	requestedBy: string;
}): Promise<void> => {
	const response = await fetch(
		`${GITHUB_API_ORIGIN}/repos/${GITHUB_REPOSITORY}/actions/workflows/versions.yml/dispatches`,
		{
			method: "POST",
			headers: buildHeaders(),
			body: JSON.stringify({
				ref: GITHUB_DEFAULT_BRANCH,
				inputs: { requested_by: requestedBy },
			}),
		},
	);

	if (!response.ok) {
		throw new Error(
			`versions.yml 실행 실패: ${response.status} ${await response.text()}`,
		);
	}
};

/** 모달의 ref 드롭다운에 채울 선택지 하나. */
interface IFRefOption {
	/** 사람이 읽는 라벨 (커밋 요약) */
	label: string;
	/** 실제로 체크아웃할 ref */
	value: string;
}

/**
 * 모달에 띄울 배포 가능 ref 목록을 만듭니다. master의 최근 커밋 10개입니다.
 *
 * @description 태그는 넣지 않습니다(`v1.10.9` 같은 태그로 고르지 않고 커밋으로만 고릅니다).
 * 실패하면 빈 목록으로 취급합니다 — 모달 자체는 떠야 하기 때문입니다.
 */
export const fetchRefOptions = async (): Promise<IFRefOption[]> => {
	const repository = GITHUB_REPOSITORY;

	// 모달을 띄운 뒤 views.update로 채우므로 trigger_id 3초 제한은 벗어났지만,
	// Slack이 상호작용 응답을 3초 안에 받아야 하는 제한은 그대로입니다.
	// 예산: views.open(~300ms) + 여기(≤1s) + views.update(~300ms) ≈ 1.6s.
	// 못 받으면 알림 시점 커밋만 있는 모달로 남습니다 — 대부분의 배포는 그 커밋입니다.
	let commits: Array<{ sha: string; commit: { message: string } }> = [];
	try {
		const response = await fetch(
			`${GITHUB_API_ORIGIN}/repos/${repository}/commits?sha=${GITHUB_DEFAULT_BRANCH}&per_page=10`,
			{ headers: buildHeaders(), signal: AbortSignal.timeout(1000) },
		);
		if (response.ok) {
			commits = await response.json();
		}
	} catch {
		return [];
	}

	// Slack static_select 라벨은 75자까지만 받습니다.
	return commits.map((commit) => ({
		label:
			`${commit.sha.slice(0, 7)} ${commit.commit.message.split("\n")[0]}`.slice(
				0,
				75,
			),
		value: commit.sha,
	}));
};
