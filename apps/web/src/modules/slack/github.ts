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

/**
 * 버전 번호를 가진 배포 대상.
 *
 * @description 웹은 지속 배포되는 단일 인스턴스라 버전 개념이 없습니다(docs/versioning.md).
 * 그래서 `TDeployTarget` 에서 web을 뺀 이 타입이 "버전을 올릴 수 있는 것"의 경계입니다.
 */
export type TVersionedTarget = Exclude<TDeployTarget, "web">;

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
 *
 * 버전을 넘기면 워크플로가 그 값을 기본 브랜치에 커밋하고 그 커밋을 빌드하므로,
 * 이때 `ref` 는 쓰이지 않습니다. 여기서 거르지 않고 그대로 넘기는 이유는 무엇이
 * 무시됐는지를 워크플로 로그에도 남기기 위해서입니다.
 *
 * @param appVersion 올릴 앱 버전(x.y.z). 비우면 레포에 적힌 값을 그대로 씁니다.
 * @param extensionVersion 올릴 확장 버전(x.y.z). 비우면 레포에 적힌 값을 그대로 씁니다.
 */
export const dispatchRelease = async ({
	targets,
	ref,
	appVersion = "",
	extensionVersion = "",
}: {
	targets: TDeployTarget[];
	ref: string;
	appVersion?: string;
	extensionVersion?: string;
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
					app_version: appVersion,
					extension_version: extensionVersion,
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

/** apps/app/app.json 에서 읽어야 하는 부분만. */
interface IFAppConfigFile {
	expo?: { version?: string };
}

/** apps/chrome-extension/package.json 에서 읽어야 하는 부분만. */
interface IFPackageFile {
	version?: string;
}

/**
 * 기본 브랜치에 적혀 있는 앱·확장의 현재 버전을 읽습니다.
 *
 * @description 모달 제출도 Slack 3초 제한 안에서 끝나야 하므로 둘을 병렬로 받고 짧게
 * 끊습니다. 못 받으면 null을 돌려주고 호출한 쪽은 증가 여부 검사를 건너뜁니다 —
 * 워크플로의 bump 스크립트가 같은 검사를 다시 하므로, 낮은 버전이 그대로 스토어까지
 * 흘러가지는 않습니다. 여기서 하는 것은 "채널에 실패 알림이 남기 전에 막는" 것뿐입니다.
 */
export const fetchCurrentVersions = async (): Promise<
	Record<TVersionedTarget, string | null>
> => {
	const repository = getGithubRepository();
	const headers: HeadersInit = {
		accept: "application/vnd.github.raw+json",
		authorization: `Bearer ${getGithubDispatchToken()}`,
		"x-github-api-version": "2022-11-28",
	};

	const readJson = async <T>(path: string): Promise<T | null> => {
		try {
			const response = await fetch(
				`${GITHUB_API_ORIGIN}/repos/${repository}/contents/${path}?ref=${GITHUB_DEFAULT_BRANCH}`,
				{ headers, signal: AbortSignal.timeout(800) },
			);

			if (!response.ok) return null;

			return (await response.json()) as T;
		} catch {
			return null;
		}
	};

	const [appConfig, extensionPackage] = await Promise.all([
		readJson<IFAppConfigFile>("apps/app/app.json"),
		readJson<IFPackageFile>("apps/chrome-extension/package.json"),
	]);

	return {
		app: appConfig?.expo?.version ?? null,
		extension: extensionPackage?.version ?? null,
	};
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

	// 모달을 띄운 뒤 views.update로 채우므로 trigger_id 3초 제한은 벗어났지만,
	// Slack이 상호작용 응답을 3초 안에 받아야 하는 제한은 그대로입니다.
	// 예산: views.open(~300ms) + 여기(≤1s) + views.update(~300ms) ≈ 1.6s.
	// 못 받으면 알림 시점 커밋만 있는 모달로 남습니다 — 대부분의 배포는 그 커밋입니다.
	const withTimeout = (url: string) =>
		fetch(url, { headers, signal: AbortSignal.timeout(1000) })
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
