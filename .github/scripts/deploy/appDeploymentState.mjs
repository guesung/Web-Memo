/** 앱 배포 순서는 완료 시각이 아니라 현재 develop의 커밋 계보로 판정합니다. */
export function decideStagingApp({
	sha,
	branchSha,
	validatedShas,
	deployedShas,
	isAncestor,
}) {
	if (!isAncestor(sha, branchSha)) {
		return { shouldBuild: false, reason: "현재 develop 계보에서 제외된 후보" };
	}

	const currentDeployments = deployedShas.filter((candidate) =>
		isAncestor(candidate, branchSha),
	);
	if (currentDeployments.some((candidate) => isAncestor(sha, candidate))) {
		return {
			shouldBuild: false,
			reason: "동일하거나 더 최신 앱이 이미 배포됨",
		};
	}

	const hasNewerCandidate = validatedShas.some(
		(candidate) =>
			candidate !== sha &&
			isAncestor(candidate, branchSha) &&
			isAncestor(sha, candidate),
	);
	if (hasNewerCandidate) {
		return { shouldBuild: false, reason: "더 최신 검증 통과 후보에 변경 승계" };
	}

	const ancestors = currentDeployments.filter((candidate) =>
		isAncestor(candidate, sha),
	);
	const baseSha = ancestors.reduce(
		(latest, candidate) =>
			!latest || isAncestor(latest, candidate) ? candidate : latest,
		null,
	);
	return {
		shouldBuild: true,
		baseSha,
		reason: baseSha
			? "마지막 앱 배포 성공 이후 변경 판정"
			: "성공 기준 없음: 전체 앱 빌드",
	};
}

export function isValidatedRun({ jobs }) {
	return ["ci", "changes"].every((name) =>
		jobs.some((job) => job.name === name && job.conclusion === "success"),
	);
}

export function readDeploymentShas({ artifacts, platform }) {
	const pattern = new RegExp(
		`^staging-app-success-${platform}-([a-f0-9]{40})-[0-9]+-[0-9]+$`,
	);
	return artifacts.flatMap((artifact) => {
		const match = pattern.exec(artifact.name);
		if (
			!match ||
			artifact.expired ||
			artifact.workflow_run?.head_branch !== "develop" ||
			artifact.workflow_run?.head_sha !== match[1]
		) {
			return [];
		}
		return [match[1]];
	});
}
