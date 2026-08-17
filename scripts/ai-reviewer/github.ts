import { issueInstallationToken, loadReviewerConfig } from "./appToken.ts";
import type { TPersona } from "./markers.ts";
import type { IFReviewComment } from "./threads.ts";

const GITHUB_API_BASE = "https://api.github.com";
const PAGE_SIZE = 100;

/**
 * 지정한 페르소나 봇의 토큰으로 GitHub API를 호출한다.
 * @description 실패 시 상태 코드와 응답 본문을 포함한 예외를 던진다.
 */
export const githubRequest = async ({
	persona,
	method,
	path,
	body,
}: {
	persona: TPersona;
	method: string;
	path: string;
	body?: unknown;
}): Promise<unknown> => {
	const token = await issueInstallationToken(persona);

	const response = await fetch(`${GITHUB_API_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json",
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`GitHub API ${method} ${path} 실패 (${response.status}): ${await response.text()}`);
	}

	return response.json();
};

/**
 * PR의 리뷰 코멘트를 전부 가져온다.
 * @description 페이지당 100건씩 끝까지 순회한다. 읽기 전용이라 인턴 봇 토큰을 사용한다.
 */
export const listReviewComments = async (pullNumber: number): Promise<IFReviewComment[]> => {
	const { repo } = loadReviewerConfig();
	const collected: IFReviewComment[] = [];
	let page = 1;

	while (true) {
		const chunk = (await githubRequest({
			persona: "intern",
			method: "GET",
			path: `/repos/${repo}/pulls/${pullNumber}/comments?per_page=${PAGE_SIZE}&page=${page}`,
		})) as IFReviewComment[];

		collected.push(...chunk);

		if (chunk.length < PAGE_SIZE) {
			return collected;
		}

		page += 1;
	}
};

/** PR의 head 커밋 SHA와 본문을 가져온다 */
export const getPullRequest = async (
	pullNumber: number,
): Promise<{ headSha: string; body: string }> => {
	const { repo } = loadReviewerConfig();
	const pull = (await githubRequest({
		persona: "intern",
		method: "GET",
		path: `/repos/${repo}/pulls/${pullNumber}`,
	})) as { head: { sha: string }; body: string | null };

	return { headSha: pull.head.sha, body: pull.body ?? "" };
};

/**
 * 특정 파일·라인에 인라인 리뷰 코멘트를 단다.
 * @description `commitSha`가 현재 head와 다르면 GitHub이 422를 반환하므로
 * 호출 직전에 `getPullRequest`로 최신 SHA를 받아 넘긴다.
 */
export const postReviewComment = async ({
	persona,
	pullNumber,
	path,
	line,
	body,
	commitSha,
}: {
	persona: TPersona;
	pullNumber: number;
	path: string;
	line: number;
	body: string;
	commitSha: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "POST",
		path: `/repos/${repo}/pulls/${pullNumber}/comments`,
		body: { commit_id: commitSha, path, line, side: "RIGHT", body },
	});
};

/** 기존 리뷰 스레드에 답글을 단다 */
export const postReviewReply = async ({
	persona,
	pullNumber,
	rootId,
	body,
}: {
	persona: TPersona;
	pullNumber: number;
	rootId: number;
	body: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "POST",
		path: `/repos/${repo}/pulls/${pullNumber}/comments/${rootId}/replies`,
		body: { body },
	});
};

/**
 * PR에 일반 코멘트를 단다.
 * @description 리뷰 코멘트가 아니므로 미답변 스레드 판별 대상에서 자동 제외된다.
 * 시니어의 지적 요약 코멘트에 사용한다 (스펙 §5.3).
 */
export const postIssueComment = async ({
	persona,
	pullNumber,
	body,
}: {
	persona: TPersona;
	pullNumber: number;
	body: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "POST",
		path: `/repos/${repo}/issues/${pullNumber}/comments`,
		body: { body },
	});
};

/** PR 본문을 통째로 교체한다 */
export const updatePullRequestBody = async ({
	persona,
	pullNumber,
	body,
}: {
	persona: TPersona;
	pullNumber: number;
	body: string;
}): Promise<void> => {
	const { repo } = loadReviewerConfig();

	await githubRequest({
		persona,
		method: "PATCH",
		path: `/repos/${repo}/pulls/${pullNumber}`,
		body: { body },
	});
};
