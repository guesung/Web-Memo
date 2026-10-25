/**
 * 워크플로 실행이 남긴 아티팩트의 조회와 다운로드 링크 판정.
 *
 * Slack 알림이 "이 빌드의 확장을 바로 받아 설치해 보기" 버튼을 달 때 씁니다.
 * 판정은 부작용 없는 순수 함수로 두고, 네트워크 호출만 fetchRunArtifacts에 모읍니다.
 */

/** cd-extension.yml이 압축을 푼 빌드 결과물을 올리는 아티팩트 이름의 접두사(extension-production-v1.10.14). */
const EXTENSION_ARTIFACT_PREFIX = "extension-";

/**
 * 아티팩트 목록에서 사람이 받아 설치할 확장 아티팩트를 고릅니다.
 *
 * 같은 실행에는 스토어 제출용 zip(`store-package-extension-…`)도 함께 올라옵니다. 그것은 zip을 한 번 더
 * 감싼 것이라 받아서 바로 로드할 수 없으므로 접두사가 `extension-`인 것만 봅니다.
 * 보관 기간이 지난(expired) 것은 링크가 죽어 있으므로 제외합니다.
 *
 * @param {Array<{ id: number, name: string, expired?: boolean }>} artifacts
 * @returns {{ id: number, name: string } | null}
 */
export const pickExtensionArtifact = (artifacts) =>
	artifacts.find(
		({ name, expired }) => name.startsWith(EXTENSION_ARTIFACT_PREFIX) && !expired,
	) ?? null;

/**
 * 아티팩트 하나를 내려받는 GitHub 웹 주소를 만듭니다. GitHub에 로그인해 레포를 볼 수 있는 사람이 열면
 * 바로 다운로드가 시작됩니다. API 주소(api.github.com)는 토큰이 없으면 받을 수 없어 쓰지 않습니다.
 *
 * @param {object} params
 * @param {string} params.serverUrl 예: https://github.com
 * @param {string} params.repository 예: guesung/Web-Memo
 * @param {string} params.runId
 * @param {number} params.artifactId
 * @returns {string}
 */
export const buildArtifactDownloadUrl = ({
	serverUrl,
	repository,
	runId,
	artifactId,
}) => `${serverUrl}/${repository}/actions/runs/${runId}/artifacts/${artifactId}`;

/**
 * 이 실행의 아티팩트 목록을 조회합니다. 실패하면 던집니다 — 호출한 쪽이 버튼만 빼고 알림은 보냅니다.
 *
 * @param {object} params
 * @param {string} params.repository
 * @param {string} params.runId
 * @param {string} params.token 읽기 권한(actions: read)이 있는 토큰
 * @param {string} [params.apiUrl] GitHub API 주소. 기본은 Actions가 채워 주는 GITHUB_API_URL입니다.
 * @returns {Promise<Array<{ id: number, name: string, expired?: boolean }>>}
 */
export const fetchRunArtifacts = async ({
	repository,
	runId,
	token,
	apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com",
}) => {
	const response = await fetch(
		`${apiUrl}/repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
		{
			headers: {
				accept: "application/vnd.github+json",
				authorization: `Bearer ${token}`,
				"x-github-api-version": "2022-11-28",
			},
			signal: AbortSignal.timeout(5000),
		},
	);

	if (!response.ok) {
		throw new Error(`아티팩트 목록 조회 실패: ${response.status}`);
	}

	return (await response.json()).artifacts ?? [];
};
