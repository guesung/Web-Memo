import {
	GITHUB_DEFAULT_BRANCH,
	getGithubDispatchToken,
	getGithubRepository,
} from "./config";

/** GitHub REST API 주소입니다. */
export const GITHUB_API_ORIGIN = "https://api.github.com";

/** GitHub API 공통 헤더. */
export const buildHeaders = (): HeadersInit => ({
	accept: "application/vnd.github+json",
	authorization: `Bearer ${getGithubDispatchToken()}`,
	"x-github-api-version": "2022-11-28",
});

/** 실패를 삼키지 않는 GitHub API 호출. 버전 커밋 경로는 조용히 넘어가면 안 됩니다. */
export const requestGithub = async <T>(
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
