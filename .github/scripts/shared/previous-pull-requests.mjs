/**
 * 자동화가 예전에 올렸던 PR(닫힘·머지)의 기록을 GitHub API 로 읽습니다.
 *
 * Sentry AI 분석·GA 이벤트 점검·SEO 자동 수정은 전용 저장소가 없어, 사람이 자동 PR 을 닫거나
 * 머지한 판단을 다음 실행이 알 길이 없었습니다. 이 모듈이 그 기록을 정제해 돌려주고,
 * 각 자동화가 자기 입력(context.json·검증 규칙·수정 대상 선정)에 반영합니다.
 *
 * 원칙
 *   - 조회는 결정적 스크립트가 합니다. AI 단계에는 GitHub 접근 권한을 주지 않습니다.
 *   - 같은 저장소의 브랜치에서 올라온 PR 만 봅니다(포크 PR 은 외부 입력이라 제외).
 *   - 코멘트는 저장소 소유자(author_association=OWNER)가 쓴 것만 담습니다.
 *   - 최근에 닫힌 순으로 최대 20건, 본문·코멘트는 길이를 제한합니다.
 *     마스킹·비신뢰 표시 같은 도메인별 정제는 부르는 쪽이 덧붙입니다.
 *   - 조회 실패는 자동화를 멈출 이유가 아닙니다. loadPreviousPullRequests 는 던지지 않고
 *     이전 기록 없이 진행하게 하며, 실패 사실을 Step Summary 에 남깁니다.
 */

import { appendFileSync } from "node:fs";

export const MAX_PREVIOUS_PULL_REQUESTS = 20;
const MAX_TITLE_LENGTH = 300;
const MAX_BODY_LENGTH = 6000;
const MAX_COMMENT_LENGTH = 1000;
const MAX_OWNER_COMMENTS = 5;

const clip = (value, maxLength) => {
	const text = String(value ?? "")
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
		.trim();

	return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

const createGithubRequest = ({ token, fetchImpl }) => async (path) => {
	const response = await fetchImpl(`https://api.github.com${path}`, {
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${token}`,
			"x-github-api-version": "2022-11-28",
		},
	});
	if (!response.ok) {
		// 토큰이 메시지에 섞이지 않게 경로(쿼리 제외)와 상태 코드만 남깁니다.
		throw new Error(`GitHub API 실패: ${path.split("?")[0]} -> ${response.status}`);
	}

	return await response.json();
};

/** 저장소 소유자가 쓴 코멘트 본문만, 최근 것부터 정해진 개수까지 남깁니다. */
export const selectOwnerComments = ({ comments }) =>
	(Array.isArray(comments) ? comments : [])
		.filter((comment) => comment?.author_association === "OWNER")
		.map((comment) => clip(comment.body, MAX_COMMENT_LENGTH))
		.filter(Boolean)
		.slice(-MAX_OWNER_COMMENTS);

/**
 * GitHub pull 객체 목록에서 이 자동화의 닫힌·머지된 PR 만 최근에 닫힌 순으로 고릅니다.
 * @description 검색 API 의 head 한정자는 일치 방식이 문서화돼 있지 않아, 브랜치 조건은 여기서 다시 엄격하게 봅니다.
 */
export const selectPreviousPulls = ({ pulls, repository, branch, branchPrefix, limit = MAX_PREVIOUS_PULL_REQUESTS }) =>
	(Array.isArray(pulls) ? pulls : [])
		.filter((pull) => pull?.state === "closed")
		.filter((pull) => pull.head?.repo?.full_name?.toLowerCase() === repository.toLowerCase())
		.filter((pull) => (branch ? pull.head?.ref === branch : pull.head?.ref?.startsWith(branchPrefix)))
		.sort((left, right) => String(right.closed_at ?? "").localeCompare(String(left.closed_at ?? "")))
		.slice(0, limit);

const toPreviousPullRequest = ({ pull, comments }) => ({
	number: pull.number,
	url: pull.html_url ?? "",
	branch: pull.head.ref,
	state: pull.merged_at ? "merged" : "closed",
	title: clip(pull.title, MAX_TITLE_LENGTH),
	body: clip(pull.body, MAX_BODY_LENGTH),
	closedAt: pull.closed_at ?? "",
	ownerComments: selectOwnerComments({ comments }),
});

const listByBranch = async ({ request, repository, branch, limit }) => {
	const owner = repository.split("/")[0];

	return await request(
		`/repos/${repository}/pulls?state=closed&head=${encodeURIComponent(`${owner}:${branch}`)}&sort=updated&direction=desc&per_page=${limit}`,
	);
};

/** pulls 목록 API 는 브랜치 접두사로 거를 수 없어, 검색으로 번호를 찾고 PR 을 하나씩 읽습니다. */
const listByPrefix = async ({ request, repository, branchPrefix, limit }) => {
	const query = `repo:${repository} is:pr is:closed head:${branchPrefix}`;
	const found = await request(
		`/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${limit}`,
	);
	const pulls = [];
	for (const item of (found?.items ?? []).slice(0, limit)) {
		pulls.push(await request(`/repos/${repository}/pulls/${item.number}`));
	}

	return pulls;
};

/**
 * 한 브랜치(branch) 또는 브랜치 접두사(branchPrefix)로 올라왔던 닫힌·머지된 PR 을 읽습니다.
 * @returns {Promise<Array<{ number: number, url: string, branch: string, state: "merged" | "closed", title: string, body: string, closedAt: string, ownerComments: string[] }>>}
 */
export const fetchPreviousPullRequests = async ({
	repository,
	token,
	branch,
	branchPrefix,
	limit = MAX_PREVIOUS_PULL_REQUESTS,
	fetchImpl = fetch,
}) => {
	if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
		throw new Error("GITHUB_REPOSITORY 가 필요합니다");
	}
	if (!token) {
		throw new Error("GitHub 토큰이 필요합니다");
	}
	if (Boolean(branch) === Boolean(branchPrefix)) {
		throw new Error("branch 와 branchPrefix 중 하나만 지정해야 합니다");
	}

	const request = createGithubRequest({ token, fetchImpl });
	const listed = branch
		? await listByBranch({ request, repository, branch, limit })
		: await listByPrefix({ request, repository, branchPrefix, limit });
	const pulls = selectPreviousPulls({ pulls: listed, repository, branch, branchPrefix, limit });

	const results = [];
	for (const pull of pulls) {
		const comments = await request(`/repos/${repository}/issues/${pull.number}/comments?per_page=100`);
		results.push(toPreviousPullRequest({ pull, comments }));
	}

	return results;
};

/**
 * fetchPreviousPullRequests 를 부르되 던지지 않습니다.
 * @description 조회에 실패하면 빈 목록으로 진행하게 하고, 실패 사실을 경고와 Step Summary 에 남깁니다. label 은 어느 자동화인지 알리는 이름입니다.
 * @returns {Promise<{ pullRequests: Awaited<ReturnType<typeof fetchPreviousPullRequests>>, failed: boolean, message: string }>}
 */
export const loadPreviousPullRequests = async ({ label, ...options }) => {
	try {
		return { pullRequests: await fetchPreviousPullRequests(options), failed: false, message: "" };
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		const message = `${label}: 이전 자동 PR 기록을 조회하지 못해 이전 기록 없이 진행합니다 (${reason.replace(/[\r\n]+/g, " ")})`;
		console.warn(`::warning::${message}`);
		if (process.env.GITHUB_STEP_SUMMARY) {
			appendFileSync(process.env.GITHUB_STEP_SUMMARY, `> ⚠️ ${message}\n\n`);
		}

		return { pullRequests: [], failed: true, message };
	}
};
