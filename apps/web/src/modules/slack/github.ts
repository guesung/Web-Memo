import {
	GITHUB_DEFAULT_BRANCH,
	getGithubDispatchToken,
	getGithubRepository,
} from "./config";

const GITHUB_API_ORIGIN = "https://api.github.com";

/** GitHub API 공통 헤더. */
const buildHeaders = (): HeadersInit => ({
	accept: "application/vnd.github+json",
	authorization: `Bearer ${getGithubDispatchToken()}`,
	"x-github-api-version": "2022-11-28",
});

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
		`${GITHUB_API_ORIGIN}/repos/${getGithubRepository()}/actions/workflows/release.yml/dispatches`,
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
		`${GITHUB_API_ORIGIN}/repos/${getGithubRepository()}/actions/workflows/versions.yml/dispatches`,
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
	/** 사람이 읽는 라벨 (태그명 또는 커밋 요약) */
	label: string;
	/** 실제로 체크아웃할 ref */
	value: string;
}

/**
 * 모달에 띄울 배포 가능 ref 목록을 만듭니다.
 *
 * @description trigger_id는 3초 안에 써야 하므로 태그와 커밋을 병렬로 가져옵니다.
 * 한쪽이 실패해도 모달 자체는 떠야 하므로 실패한 쪽은 빈 목록으로 취급합니다.
 */
export const fetchRefOptions = async (): Promise<IFRefOption[]> => {
	const repository = getGithubRepository();
	const headers = buildHeaders();

	// trigger_id가 3초 안에 만료되므로, 목록을 못 받아도 모달은 떠야 합니다.
	const withTimeout = (url: string) =>
		fetch(url, { headers, signal: AbortSignal.timeout(1500) })
			.then((response) => (response.ok ? response.json() : []))
			.catch(() => []);

	const [tags, commits] = await Promise.all([
		withTimeout(`${GITHUB_API_ORIGIN}/repos/${repository}/tags?per_page=10`),
		withTimeout(
			`${GITHUB_API_ORIGIN}/repos/${repository}/commits?sha=${GITHUB_DEFAULT_BRANCH}&per_page=10`,
		),
	]);

	const tagOptions: IFRefOption[] = (
		tags as Array<{ name: string; commit: { sha: string } }>
	).map((tag) => ({
		label: `🏷️ ${tag.name}`,
		value: tag.name,
	}));

	const commitOptions: IFRefOption[] = (
		commits as Array<{ sha: string; commit: { message: string } }>
	).map((commit) => ({
		label: `${commit.sha.slice(0, 7)} ${commit.commit.message.split("\n")[0]}`,
		value: commit.sha,
	}));

	// Slack static_select는 선택지 100개까지, 라벨은 75자까지만 받습니다.
	return [...tagOptions, ...commitOptions]
		.slice(0, 100)
		.map(({ label, value }) => ({ label: label.slice(0, 75), value }));
};
