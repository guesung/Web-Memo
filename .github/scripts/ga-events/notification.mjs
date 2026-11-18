const PREFIX = "📊 주간 GA 이벤트 점검";

/**
 * 점검이 정상 종료된 주의 결과를 리포트 채널에 보낼 한 줄로 만듭니다.
 * 보낼 것이 없으면(dry run, 게시 잡이 이어서 알리는 중간 상태 등) null을 돌려줍니다.
 * 실패는 여기서 다루지 않습니다 — 워크플로의 Notify failure 단계가 CI 채널로 보냅니다.
 */
export const buildResultNotification = (result, runUrl) => {
	if (result.dryRun) {
		return null;
	}
	if (result.status === "published" && result.pullRequest) {
		const events = result.events ?? [];

		return `${PREFIX}: 누락 이벤트 ${events.length}종을 추가하는 PR을 올렸습니다 (${events.join(", ")}) — <${result.pullRequest}|PR 보기>`;
	}
	if (result.status === "none") {
		return `${PREFIX}: 이번 주에는 누락된 이벤트가 없습니다 — <${runUrl}|실행 로그 보기>`;
	}
	if (result.status === "duplicate") {
		const links = (result.duplicatePullRequests ?? []).map((url) => `<${url}|열린 PR 보기>`).join(", ");

		return `${PREFIX}: 아직 열려 있는 GA 이벤트 PR이 있어 이번 주 점검을 건너뛰었습니다 — ${links || `<${runUrl}|실행 로그 보기>`}`;
	}

	return null;
};
