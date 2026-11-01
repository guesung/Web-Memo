import {
	GITHUB_DEFAULT_BRANCH,
	GITHUB_REPOSITORY,
	getGithubDispatchToken,
} from "./config";

/** GitHub REST API 주소입니다. */
export const GITHUB_API_ORIGIN = "https://api.github.com";

/** GitHub API 공통 헤더. */
export const buildHeaders = (): HeadersInit => ({
	accept: "application/vnd.github+json",
	authorization: `Bearer ${getGithubDispatchToken()}`,
	"x-github-api-version": "2022-11-28",
});

/**
 * GitHub API가 거절한 응답. 메시지 문자열은 기존과 같고, 사용자에게 그대로 보여줄
 * GitHub의 `message`와 상태 코드를 따로 들고 있습니다.
 */
export class GithubApiError extends Error {
	readonly status: number;
	/** GitHub 응답 본문의 `message`. JSON이 아니면 본문 앞부분. */
	readonly githubMessage: string;

	constructor({
		path,
		status,
		body,
	}: {
		path: string;
		status: number;
		body: string;
	}) {
		super(`GitHub ${path} 실패: ${status} ${body.slice(0, 200)}`);
		this.name = "GithubApiError";
		this.status = status;
		this.githubMessage = extractGithubMessage(body);
	}
}

const extractGithubMessage = (body: string): string => {
	try {
		const parsed = JSON.parse(body) as { message?: unknown };

		if (typeof parsed.message === "string") return parsed.message;
	} catch {
		// JSON이 아니면 본문 그대로 씁니다.
	}

	return body.slice(0, 200);
};

/** 실패를 삼키지 않는 GitHub API 호출. 버전 커밋 경로는 조용히 넘어가면 안 됩니다. */
export const requestGithub = async <T>(
	path: string,
	init?: { method?: string; body?: unknown },
): Promise<T> => {
	const response = await fetch(
		`${GITHUB_API_ORIGIN}/repos/${GITHUB_REPOSITORY}${path}`,
		{
			method: init?.method ?? "GET",
			headers: buildHeaders(),
			...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
		},
	);

	if (!response.ok) {
		throw new GithubApiError({
			path,
			status: response.status,
			body: await response.text(),
		});
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
