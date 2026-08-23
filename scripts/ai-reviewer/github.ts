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
 * 시니어가 답글을 달 스레드를 고르는 흐름(findPendingThreads)도 이 함수의 결과를
 * 먼저 거쳐야 하므로, 인턴 App이 설치 해제되면 시니어 흐름도 함께 멈춘다 — 이때
 * 에러 메시지는 "senior"가 아니라 "intern" 봇을 지목하니 원인을 헷갈리지 않도록
 * 유의한다.
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

/**
 * PR의 head 커밋 SHA와 본문을 가져온다.
 * @description 읽기 전용이라 인턴 봇 토큰을 사용한다. 시니어 페르소나의 쓰기 작업
 * (postReviewComment 등)도 commitSha를 얻기 위해 이 함수를 거치므로, 인턴 App이
 * 설치 해제되면 시니어 흐름도 함께 실패한다 — 이때 에러 메시지는 "senior"가 아니라
 * "intern" 봇을 지목하니 원인을 헷갈리지 않도록 유의한다.
 */
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

/** PR에 등록된 리뷰 중 이 워크플로우가 사용하는 필드만 추린 형태 */
export interface IFReview {
	id: number;
	/** `APPROVED` · `COMMENTED` · `CHANGES_REQUESTED` · `DISMISSED` 중 하나 */
	state: string;
	/** 리뷰를 남긴 주체. App 봇이면 `이도현[bot]` 처럼 `[bot]` 접미사가 붙는다 */
	user: { login: string } | null;
	/** 리뷰 본문. 봇 마커가 붙어 있어 어느 페르소나의 승인인지 판별할 수 있다 */
	body: string;
}

/**
 * PR에 등록된 리뷰를 전부 가져온다.
 * @description 페이지당 100건씩 끝까지 순회한다. 읽기 전용이라 인턴 봇 토큰을 사용한다.
 * 같은 봇이 이미 승인했는지 판별해 중복 승인을 막는 데 쓴다.
 */
export const listReviews = async (pullNumber: number): Promise<IFReview[]> => {
	const { repo } = loadReviewerConfig();
	const collected: IFReview[] = [];
	let page = 1;

	while (true) {
		const chunk = (await githubRequest({
			persona: "intern",
			method: "GET",
			path: `/repos/${repo}/pulls/${pullNumber}/reviews?per_page=${PAGE_SIZE}&page=${page}`,
		})) as IFReview[];

		collected.push(...chunk);

		if (chunk.length < PAGE_SIZE) {
			return collected;
		}

		page += 1;
	}
};

/**
 * 지정한 페르소나 봇 명의로 PR을 승인한다.
 * @description 봇은 PR 작성자와 다른 주체라 GitHub의 self-approve 제한에 걸리지 않고,
 * 이 승인은 브랜치 보호 규칙의 필수 승인 수(`required_approving_review_count`)에
 * 그대로 반영된다. `commit_id`를 넘기지 않으므로 승인은 호출 시점의 head 커밋에 붙는다.
 */
export const postReviewApproval = async ({
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
		path: `/repos/${repo}/pulls/${pullNumber}/reviews`,
		body: { event: "APPROVE", body },
	});
};
