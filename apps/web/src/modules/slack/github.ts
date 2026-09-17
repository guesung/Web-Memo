import {
	GITHUB_DEFAULT_BRANCH,
	getGithubDispatchToken,
	getGithubRepository,
} from "./config";
import { replaceVersionInJson } from "./version";

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

/** 버전을 갖는 배포 트랙. 웹은 버전이 없습니다(docs/versioning.md). */
export type TVersionTrack = "app" | "extension";

/** 버전 트랙 하나의 단일 진실 원천 파일. */
interface IFVersionFile {
	path: string;
	/** 파싱한 JSON에서 버전 문자열을 꺼냅니다. 트랙마다 위치가 달라 파일이 직접 압니다. */
	read: (json: unknown) => string | undefined;
}

/** 버전 트랙별 단일 진실 원천 파일. docs/versioning.md의 표와 일대일입니다. */
const VERSION_FILES: Record<TVersionTrack, IFVersionFile> = {
	app: {
		path: "apps/app/app.json",
		// app.json은 Expo 설정이라 버전이 `expo` 아래에 있습니다.
		read: (json) => (json as { expo?: { version?: string } }).expo?.version,
	},
	extension: {
		path: "apps/chrome-extension/package.json",
		read: (json) => (json as { version?: string }).version,
	},
};

/** master의 버전 파일 하나를 읽습니다. 못 읽으면 던집니다. */
const fetchVersion = async ({
	track,
	timeoutMs,
}: {
	track: TVersionTrack;
	timeoutMs: number;
}): Promise<string> => {
	const file = VERSION_FILES[track];
	const response = await fetch(
		`${GITHUB_API_ORIGIN}/repos/${getGithubRepository()}/contents/${file.path}?ref=${GITHUB_DEFAULT_BRANCH}`,
		{
			headers: { ...buildHeaders(), accept: "application/vnd.github.raw+json" },
			signal: AbortSignal.timeout(timeoutMs),
		},
	);

	if (!response.ok) {
		throw new Error(`${file.path} 조회 실패: ${response.status}`);
	}

	const version = file.read(JSON.parse(await response.text()));

	if (typeof version !== "string") {
		throw new Error(`${file.path}에서 버전을 읽지 못했습니다`);
	}

	return version;
};

/** `fetchCurrentVersionsForModal`이 돌려주는 현재 버전. 조회에 실패한 쪽은 빠집니다. */
export interface IFCurrentVersions {
	app?: string;
	extension?: string;
}

/**
 * 모달 placeholder("현재 1.10.16")에 채울 현재 버전.
 *
 * @description **판정에 쓰지 마세요.** 실패를 빈 값으로 삼키므로, 이 값으로 버전을
 * 비교하면 조회가 죽었을 때 "현재 이하" 게이트가 조용히 통과합니다. 검증에는
 * 반드시 `fetchVersionForBump`를 쓰세요 — 그쪽은 실패하면 던집니다.
 *
 * 이 호출은 `views.update` 경로에 얹히므로 Slack의 3초 예산 안에서 끝나야 합니다.
 * `fetchRefOptions`와 같은 1초 타임아웃을 쓰고, 못 받으면 placeholder만 빠집니다.
 */
export const fetchCurrentVersionsForModal =
	async (): Promise<IFCurrentVersions> => {
		const forModal = (track: TVersionTrack) =>
			fetchVersion({ track, timeoutMs: 1000 }).catch(() => undefined);

		const [app, extension] = await Promise.all([
			forModal("app"),
			forModal("extension"),
		]);

		return { app, extension };
	};

/**
 * 버전을 올리기 전에 확인하는 현재 버전. 못 읽으면 던집니다.
 *
 * @description 반환 타입에 `undefined`가 없는 것이 요점입니다 — 현재 버전을 모르는
 * 채로 master에 커밋을 쌓는 것보다 "다시 시도하세요"가 낫습니다. 커밋·배포를 배경으로
 * 넘긴 뒤라 동기 구간에 여유가 있어 모달 경로보다 넉넉한 타임아웃을 씁니다.
 */
export const fetchVersionForBump = (track: TVersionTrack): Promise<string> =>
	fetchVersion({ track, timeoutMs: 2500 });

/** 실패를 삼키지 않는 GitHub API 호출. 버전 커밋 경로는 조용히 넘어가면 안 됩니다. */
const requestGithub = async <T>(
	path: string,
	init?: { method?: string; body?: unknown },
): Promise<T> => {
	const response = await fetch(
		`${GITHUB_API_ORIGIN}/repos/${getGithubRepository()}${path}`,
		{
			method: init?.method ?? "GET",
			headers: buildHeaders(),
			...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
		},
	);

	if (!response.ok) {
		throw new Error(
			`GitHub ${path} 실패: ${response.status} ${(await response.text()).slice(0, 200)}`,
		);
	}

	return (await response.json()) as T;
};

/** master가 현재 가리키는 커밋 SHA. 고른 ref가 master 최신인지 판정하는 데 씁니다. */
export const fetchDefaultBranchSha = async (): Promise<string> => {
	const { object } = await requestGithub<{ object: { sha: string } }>(
		`/git/ref/heads/${GITHUB_DEFAULT_BRANCH}`,
	);

	return object.sha;
};

/**
 * 파일 원문 그대로. Contents API의 raw 미디어 타입을 씁니다.
 *
 * @param ref 읽을 시점. 브랜치명이 아니라 커밋 SHA를 넘겨 고정합니다 — 브랜치로 읽으면
 *   파일마다 다른 시점을 볼 수 있어 트리가 어느 커밋의 것도 아니게 됩니다.
 */
const fetchFileSource = async (path: string, ref: string): Promise<string> => {
	const response = await fetch(
		`${GITHUB_API_ORIGIN}/repos/${getGithubRepository()}/contents/${path}?ref=${ref}`,
		{
			headers: { ...buildHeaders(), accept: "application/vnd.github.raw+json" },
		},
	);

	if (!response.ok) {
		throw new Error(`${path} 조회 실패: ${response.status}`);
	}

	return response.text();
};

/** 올릴 버전. 지정한 트랙만 바뀝니다. */
interface IFVersionBumpInput {
	appVersion?: string;
	extensionVersion?: string;
	/** 커밋 본문에 남길 요청자. 자동 생성 커밋의 출처를 되짚을 수 있게 합니다. */
	requestedBy: string;
	/**
	 * 검증 때 확인한 master의 커밋 SHA. 필수입니다 — 안 넘기는 경로를 두면
	 * 검증한 트리와 배포되는 트리가 갈리는 구멍이 그대로 남습니다.
	 */
	expectedBaseSha: string;
}

/** 커밋 제목. 두 트랙을 함께 올릴 때는 한 줄에 둘 다 적습니다. */
export const buildBumpCommitMessage = ({
	appVersion,
	extensionVersion,
	requestedBy,
}: Omit<IFVersionBumpInput, "expectedBaseSha">): string => {
	const subject =
		appVersion && extensionVersion
			? `chore: 앱 ${appVersion} · 확장 ${extensionVersion}로 버전을 올린다`
			: appVersion
				? `chore: 앱 버전을 ${appVersion}로 올린다`
				: `chore: 확장 버전을 ${extensionVersion}로 올린다`;

	return `${subject}\n\nSlack 배포 모달에서 자동 생성 · ${requestedBy}`;
};

/**
 * 버전 파일을 고쳐 master에 커밋 하나를 쌓고 그 SHA를 돌려줍니다.
 *
 * @description Contents API(`PUT /contents/{path}`)는 파일마다 커밋을 하나씩 만들어,
 * 앱·확장을 함께 올리면 커밋이 둘로 갈립니다. 그래서 파일이 하나일 때도 Git Data API로
 * 통일합니다 — 분기를 두면 두 경로 중 한쪽만 실제로 검증됩니다.
 *
 * 실패는 삼키지 않고 그대로 던집니다. 조용히 넘기면 버전이 안 올라간 산출물이
 * 스토어에 올라가고, 그 시점에는 되돌릴 방법이 없습니다.
 */
export const commitVersionBump = async ({
	appVersion,
	extensionVersion,
	requestedBy,
	expectedBaseSha,
}: IFVersionBumpInput): Promise<string> => {
	const targets = [
		...(appVersion ? [{ file: VERSION_FILES.app, version: appVersion }] : []),
		...(extensionVersion
			? [{ file: VERSION_FILES.extension, version: extensionVersion }]
			: []),
	];

	if (targets.length === 0) {
		throw new Error("올릴 버전이 하나도 없습니다");
	}

	// 검증은 응답 전에, 커밋은 응답 뒤에 일어납니다. 그 사이 master가 움직였다면
	// 사용자가 화면에서 고르고 통과시킨 것과 다른 트리가 배포됩니다 — 모달은 이미
	// 닫혀 개입할 지점이 없으므로, 아무것도 만들기 전에 여기서 멈춥니다.
	// `git/refs` PATCH의 force: false로도 막히지만 그때는 blob·tree·commit을 다 만든
	// 뒤라 쓰레기 오브젝트가 남습니다.
	const baseCommitSha = await fetchDefaultBranchSha();

	if (baseCommitSha !== expectedBaseSha) {
		throw new Error(
			`검증 이후 master가 ${baseCommitSha.slice(0, 7)}로 움직여 버전 커밋을 만들지 않았습니다 — 다시 시도하세요`,
		);
	}

	const baseCommit = await requestGithub<{ tree: { sha: string } }>(
		`/git/commits/${baseCommitSha}`,
	);

	const treeEntries = await Promise.all(
		targets.map(async ({ file, version }) => {
			const source = await fetchFileSource(file.path, baseCommitSha);
			const currentVersion = file.read(JSON.parse(source));

			if (!currentVersion) {
				throw new Error(`${file.path}에서 현재 버전을 읽지 못했습니다`);
			}

			const { sha } = await requestGithub<{ sha: string }>("/git/blobs", {
				method: "POST",
				body: {
					content: replaceVersionInJson({
						source,
						currentVersion,
						nextVersion: version,
					}),
					encoding: "utf-8",
				},
			});

			return { path: file.path, mode: "100644", type: "blob", sha };
		}),
	);

	const tree = await requestGithub<{ sha: string }>("/git/trees", {
		method: "POST",
		body: { base_tree: baseCommit.tree.sha, tree: treeEntries },
	});

	const commit = await requestGithub<{ sha: string }>("/git/commits", {
		method: "POST",
		body: {
			message: buildBumpCommitMessage({
				appVersion,
				extensionVersion,
				requestedBy,
			}),
			tree: tree.sha,
			parents: [baseCommitSha],
		},
	});

	// force를 쓰지 않습니다 — 그 사이 master가 움직였다면 실패하는 편이 맞습니다.
	await requestGithub(`/git/refs/heads/${GITHUB_DEFAULT_BRANCH}`, {
		method: "PATCH",
		body: { sha: commit.sha },
	});

	return commit.sha;
};
