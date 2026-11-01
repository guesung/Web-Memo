import type {
	IFBlogSourceStatus,
	TBlogSourceViewState,
} from "../../types/blogReading";

/**
 * 서버 수집 상태를 화면 상태로 바꾼다. 앱·웹이 같은 규칙으로 상태 문구를 고르게 한다.
 * @description 멈춘 상태(대기·부분 실패·갱신 실패)에 재개 요청이 걸려 있으면 `resumeQueued`가 우선한다.
 * 실행 중(`collecting`·`refreshing`)이면 요청이 있어도 실행 상태를 보여 준다.
 * @example getBlogSourceViewState({ phase: "partial", resumeQueued: false }) // "partialFailed"
 */
export const getBlogSourceViewState = (
	source: Pick<IFBlogSourceStatus, "phase" | "resumeQueued">,
): TBlogSourceViewState => {
	const isStopped =
		source.phase === "pending" ||
		source.phase === "partial" ||
		source.phase === "refresh_failed";

	if (source.resumeQueued && isStopped) {
		return "resumeQueued";
	}

	switch (source.phase) {
		case "pending":
			return "waiting";
		case "collecting":
			return "collecting";
		case "partial":
			return "partialFailed";
		case "complete":
			return "complete";
		case "refreshing":
			return "refreshing";
		case "refresh_failed":
			return "refreshFailed";
	}
};
