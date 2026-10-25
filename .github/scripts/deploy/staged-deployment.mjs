/**
 * master 머지 때 CI가 미리 올려 둔 "미승격 상용 배포"를 찾는 판정.
 *
 * ci.yml이 master 푸시마다 웹을 상용 환경으로 빌드해 `--skip-domain`으로 배포해 두고(도메인은 안 붙습니다),
 * 릴리스(Slack의 웹 배포 버튼)는 그 배포를 재빌드 없이 승격만 합니다. 어느 커밋의 배포인지는 배포 때 붙인
 * 메타 `releaseSha`로 찾습니다. Vercel이 자동으로 붙이는 githubCommitSha·githubCommitRef는 체크아웃 방식에
 * 따라 값이 달라져(HEAD로 찍히는 배포가 있습니다) 신뢰하지 않습니다.
 *
 * 판정은 부작용 없는 순수 함수로 두고, 네트워크 호출은 fetchProductionDeployments에 모읍니다.
 */

/** 배포에 붙이는 메타 키. cd-web.yml의 `-m releaseSha=…`와 같은 이름이어야 합니다. */
export const RELEASE_SHA_META_KEY = "releaseSha";

/**
 * 배포 목록에서 이 커밋의 승격 가능한 배포를 고릅니다.
 *
 * 상용 대상이고 READY이며 releaseSha가 같은 것만 대상입니다. 같은 커밋을 여러 번 배포했을 수 있으므로
 * (재실행 등) 가장 나중에 만들어진 것을 고릅니다. 빌드 중이거나 실패한 배포는 승격하면 안 되므로 제외합니다.
 *
 * @param {object} params
 * @param {Array<{ uid?: string, id?: string, url?: string, created?: number, state?: string, readyState?: string, target?: string | null, meta?: Record<string, string> }>} params.deployments
 * @param {string} params.sha 배포하려는 커밋 SHA
 * @returns {{ id: string, url: string } | null} url은 https://를 포함합니다.
 */
export const pickStagedDeployment = ({ deployments, sha }) => {
	if (!sha) {
		return null;
	}

	const candidates = deployments
		.filter(
			(deployment) =>
				deployment.target === "production" &&
				(deployment.state ?? deployment.readyState) === "READY" &&
				deployment.meta?.[RELEASE_SHA_META_KEY] === sha &&
				deployment.url,
		)
		.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

	const [latest] = candidates;

	if (!latest) {
		return null;
	}

	return {
		id: latest.uid ?? latest.id ?? "",
		url: `https://${latest.url}`,
	};
};

/**
 * 프로젝트의 최근 상용 대상 READY 배포를 조회합니다. 실패하면 던집니다 — 호출한 쪽이 "못 찾음"으로 취급해
 * 재빌드 경로로 내려갑니다. 조회 실패가 배포 자체를 막으면 안 되기 때문입니다.
 *
 * 메타 필터를 서버에 맡기지 않고 최근 100건을 받아 클라이언트에서 거릅니다. 미승격 배포는 최근 것이 대부분이고,
 * 100건을 넘어간 과거 커밋은 어차피 재빌드로 내려가도 됩니다.
 *
 * @param {object} params
 * @param {string} params.projectId .vercel/project.json의 projectId
 * @param {string} params.teamId .vercel/project.json의 orgId
 * @param {string} params.token
 * @param {string} [params.apiUrl]
 * @returns {Promise<Array<object>>}
 */
export const fetchProductionDeployments = async ({
	projectId,
	teamId,
	token,
	apiUrl = "https://api.vercel.com",
}) => {
	const query = new URLSearchParams({
		projectId,
		teamId,
		target: "production",
		state: "READY",
		limit: "100",
	});
	const response = await fetch(`${apiUrl}/v6/deployments?${query}`, {
		headers: { authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(10_000),
	});

	if (!response.ok) {
		throw new Error(`Vercel 배포 목록 조회 실패: ${response.status}`);
	}

	return (await response.json()).deployments ?? [];
};
