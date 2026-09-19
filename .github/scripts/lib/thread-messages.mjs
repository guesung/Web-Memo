/**
 * Slack 스레드로 보내는 메시지의 페이로드 조립과 판정.
 *
 * 스크립트(notify-thread-*.mjs)는 파일을 import하는 즉시 main이 돌아 테스트에서
 * 불러올 수 없습니다. 판정과 조립은 부작용 없는 순수 함수로 여기 두고,
 * 스크립트는 환경변수를 읽어 이 함수를 부르고 전송만 합니다.
 */

/**
 * 스레드 루트 메시지 페이로드를 만듭니다.
 *
 * 순서는 헤드라인(어느 브랜치로 머지됐는지) → 제목 → 컨텍스트입니다.
 * 컨텍스트에는 PR 번호, 브랜치, 작성자, 커밋 링크가 이 순서로 들어갑니다.
 * PR 머지 커밋이 아니면(mergeSource가 null) PR 번호와 브랜치는 자리째 뺍니다.
 * "-" 같은 자리 표시는 넣지 않습니다.
 *
 * @param {object} params
 * @param {string} params.targetBranch 머지된 대상 브랜치(master 또는 develop)
 * @param {string} params.subject PR 제목. PR 머지 커밋이 아니면 커밋 제목입니다.
 * @param {{ prNumber: number, branch: string } | null} params.mergeSource
 * @param {string} params.actor github.actor
 * @param {string} params.commitSha
 * @param {string} params.repositoryUrl 예: https://github.com/guesung/Web-Memo
 * @returns {{ text: string, blocks: object[] }}
 */
export const buildRootPayload = ({
	targetBranch,
	subject,
	mergeSource,
	actor,
	commitSha,
	repositoryUrl,
}) => {
	const headline = `🔀 ${targetBranch} 머지`;
	const shortSha = commitSha.slice(0, 7);

	const contextParts = [
		mergeSource &&
			`<${repositoryUrl}/pull/${mergeSource.prNumber}|#${mergeSource.prNumber}>`,
		mergeSource && `\`${mergeSource.branch}\``,
		actor,
		`<${repositoryUrl}/commit/${commitSha}|\`${shortSha}\`>`,
	].filter(Boolean);

	return {
		// 알림 미리보기와 접근성 대체 텍스트로 쓰입니다. 링크 문법 없이 둡니다.
		text: [headline, subject].filter(Boolean).join(" — "),
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: subject ? `*${headline}*\n${subject}` : `*${headline}*`,
				},
			},
			{
				type: "context",
				elements: [{ type: "mrkdwn", text: contextParts.join(" · ") }],
			},
		],
	};
};
