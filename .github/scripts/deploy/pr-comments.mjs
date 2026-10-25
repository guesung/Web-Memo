/**
 * PR에 다는 확장 빌드 댓글의 조립과 GitHub 이슈 댓글 API 호출.
 *
 * PR마다 댓글을 하나만 두고 푸시할 때마다 그 댓글을 고쳐 씁니다. 커밋마다 새 댓글을 달면
 * PR 대화가 빌드 알림으로 덮이기 때문입니다. 본문에 숨긴 마커로 자기가 단 댓글을 찾습니다.
 *
 * 판정과 본문 조립은 부작용 없는 순수 함수로 두고, 네트워크 호출은 아래 세 함수에 모읍니다.
 */

import { requestJson } from "../shared/http.mjs";

/** 이 댓글을 다시 찾기 위해 본문 맨 앞에 넣는 숨은 마커. 바꾸면 이미 달린 댓글을 못 찾고 새로 답니다. */
export const EXTENSION_COMMENT_MARKER = "<!-- extension-build-download -->";

/**
 * 댓글 목록에서 이 스크립트가 단 확장 빌드 댓글을 찾습니다.
 *
 * 사람이 마커를 인용해 쓴 댓글을 고쳐 쓰지 않도록 봇이 단 댓글만 봅니다.
 *
 * @param {Array<{ id: number, body?: string, user?: { type?: string } }>} comments
 * @returns {{ id: number } | null}
 */
export const findExtensionComment = (comments) =>
	comments.find(
		({ body, user }) =>
			user?.type === "Bot" && (body ?? "").includes(EXTENSION_COMMENT_MARKER),
	) ?? null;

/**
 * 확장 빌드 결과를 알리는 PR 댓글 본문을 만듭니다.
 *
 * 성공했는데 다운로드 링크가 없으면(아티팩트 조회 실패·만료) 워크플로 링크로 안내합니다.
 * 실패하면 직전 커밋의 링크가 최신 빌드처럼 남지 않도록 실패로 덮어씁니다.
 *
 * @param {object} params
 * @param {"success" | "failure"} params.outcome
 * @param {string} params.commitSha PR head 커밋
 * @param {string} params.runUrl 이 실행의 Actions 주소
 * @param {string} [params.artifactName] 예: extension-production-v1.10.14
 * @param {string} [params.downloadUrl] buildArtifactDownloadUrl의 결과
 * @returns {string}
 */
export const buildExtensionCommentBody = ({
	outcome,
	commitSha,
	runUrl,
	artifactName,
	downloadUrl,
}) => {
	const shortSha = commitSha.slice(0, 7);

	if (outcome === "failure") {
		return [
			EXTENSION_COMMENT_MARKER,
			"### ❌ 확장 빌드 실패",
			"",
			`\`${shortSha}\` 커밋의 확장 빌드가 실패했습니다. [워크플로 로그](${runUrl})에서 원인을 확인하세요.`,
		].join("\n");
	}

	if (!downloadUrl) {
		return [
			EXTENSION_COMMENT_MARKER,
			"### 🧩 확장 빌드 완료",
			"",
			`\`${shortSha}\` 커밋의 확장을 빌드했지만 다운로드 링크를 찾지 못했습니다. [워크플로](${runUrl})의 Artifacts에서 받으세요.`,
		].join("\n");
	}

	return [
		EXTENSION_COMMENT_MARKER,
		"### 🧩 확장 빌드 완료",
		"",
		`\`${shortSha}\` 커밋으로 빌드한 확장입니다.`,
		"",
		`**[⬇️ ${artifactName ?? "확장"} 다운로드](${downloadUrl})**`,
		"",
		"<details><summary>설치 방법</summary>",
		"",
		"1. 받은 zip의 압축을 풉니다.",
		"2. `chrome://extensions`를 열고 오른쪽 위 **개발자 모드**를 켭니다.",
		"3. **압축해제된 확장 프로그램을 로드합니다**를 눌러 푼 폴더를 고릅니다.",
		"",
		"</details>",
		"",
		`GitHub에 로그인해 이 레포를 볼 수 있어야 받을 수 있고, 아티팩트 보관 기간이 지나면 링크가 죽습니다. 새 커밋을 푸시하면 이 댓글이 갱신됩니다. ([워크플로](${runUrl}))`,
	].join("\n");
};

/**
 * @param {string} token
 * @returns {Record<string, string>}
 */
const createHeaders = (token) => ({
	accept: "application/vnd.github+json",
	authorization: `Bearer ${token}`,
	"x-github-api-version": "2022-11-28",
});

/**
 * PR의 대화 댓글을 전부 읽습니다. PR 댓글은 GitHub API에서 이슈 댓글입니다.
 *
 * @param {object} params
 * @param {string} params.apiUrl
 * @param {string} params.repository
 * @param {string} params.prNumber
 * @param {string} params.token
 * @returns {Promise<Array<{ id: number, body?: string, user?: { type?: string } }>>}
 */
export const listPrComments = async ({ apiUrl, repository, prNumber, token }) => {
	const comments = [];

	for (let page = 1; ; page += 1) {
		const pageComments = await requestJson(
			`${apiUrl}/repos/${repository}/issues/${prNumber}/comments?per_page=100&page=${page}`,
			{ headers: createHeaders(token), signal: AbortSignal.timeout(5000) },
		);

		comments.push(...pageComments);

		if (pageComments.length < 100) {
			return comments;
		}
	}
};

/**
 * 확장 빌드 댓글이 있으면 고쳐 쓰고, 없으면 새로 답니다.
 *
 * @param {object} params
 * @param {string} params.apiUrl
 * @param {string} params.repository
 * @param {string} params.prNumber
 * @param {string} params.token pull-requests: write 권한이 있는 토큰
 * @param {string} params.body
 * @returns {Promise<"created" | "updated">}
 */
export const upsertExtensionComment = async ({
	apiUrl,
	repository,
	prNumber,
	token,
	body,
}) => {
	const existingComment = findExtensionComment(
		await listPrComments({ apiUrl, repository, prNumber, token }),
	);
	const options = {
		headers: { ...createHeaders(token), "content-type": "application/json" },
		body: JSON.stringify({ body }),
		signal: AbortSignal.timeout(5000),
	};

	if (existingComment) {
		await requestJson(
			`${apiUrl}/repos/${repository}/issues/comments/${existingComment.id}`,
			{ ...options, method: "PATCH" },
		);

		return "updated";
	}

	await requestJson(
		`${apiUrl}/repos/${repository}/issues/${prNumber}/comments`,
		{ ...options, method: "POST" },
	);

	return "created";
};
