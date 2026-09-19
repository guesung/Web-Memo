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

/** 타깃별 댓글 문구에 쓰는 이름. 앱은 플랫폼(iOS·Android)을 나누지 않고 "앱" 하나입니다. */
const TARGET_LABELS = {
	web: "웹",
	extension: "확장",
	app: "앱",
};

const REPLY_OUTCOME_LABELS = {
	success: { icon: "✅", word: "성공" },
	failure: { icon: "❌", word: "실패" },
};

/**
 * 이 타깃에 댓글을 달지, 단다면 성공 댓글인지 실패 댓글인지 판정합니다.
 *
 * needs의 result 값은 success, failure, cancelled, skipped 넷뿐입니다.
 *  - changed가 true가 아니면 변경이 없어 안 돈 것이므로 댓글이 없습니다.
 *  - success, failure는 각각 성공·실패 댓글입니다.
 *  - cancelled는 알리지 않습니다. 뒤이은 run이 다시 알립니다.
 *  - changed가 true인데 skipped면 ci가 실패해 밀린 경우입니다. 요약 댓글이 CI 실패를 알리므로
 *    여기서는 알리지 않습니다.
 *
 * @param {object} params
 * @param {string} params.changed changes 잡의 해당 타깃 output("true" 또는 "false")
 * @param {string} params.result 해당 cd-* 잡의 needs 결과
 * @returns {"success" | "failure" | null} null이면 댓글을 달지 않습니다.
 */
export const decideTargetReply = ({ changed, result }) => {
	if (changed !== "true") {
		return null;
	}

	if (result === "success" || result === "failure") {
		return result;
	}

	return null;
};

/**
 * 타깃별 빌드 결과 댓글 페이로드를 만듭니다.
 * 문구는 "웹 빌드 성공"처럼 타깃 + 결과이고, 이 실행의 Actions 로그 링크가 붙습니다.
 *
 * @param {object} params
 * @param {"web" | "extension" | "app"} params.target
 * @param {"success" | "failure"} params.outcome decideTargetReply의 결과
 * @param {string} params.runUrl 이 실행의 Actions 로그 주소
 * @returns {{ text: string, blocks: object[] }}
 */
export const buildTargetReplyPayload = ({ target, outcome, runUrl }) => {
	const label = TARGET_LABELS[target];
	const outcomeLabel = REPLY_OUTCOME_LABELS[outcome];

	if (!label || !outcomeLabel) {
		throw new Error(`알 수 없는 댓글 대상입니다: ${target} / ${outcome}`);
	}

	const message = `${label} 빌드 ${outcomeLabel.word}`;

	return {
		text: message,
		blocks: [
			{
				type: "section",
				text: { type: "mrkdwn", text: `${outcomeLabel.icon} *${message}*` },
			},
			{
				type: "context",
				elements: [{ type: "mrkdwn", text: `<${runUrl}|Actions 로그 보기>` }],
			},
		],
	};
};
