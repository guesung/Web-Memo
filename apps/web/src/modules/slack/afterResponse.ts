import { after } from "next/server";

/**
 * 응답을 보낸 뒤에도 끝까지 살아 있어야 하는 작업을 넘깁니다.
 *
 * @description Slack은 3초 안에 응답을 못 받으면 사용자에게 실패로 표시합니다.
 * 버전 커밋(Git Data API 6왕복) + 배포 실행은 그 예산에 들어가지 않아 응답 뒤로
 * 미뤄야 합니다. Next `after()`는 Vercel에서는 내부적으로 `waitUntil`로 함수를 살려 두고,
 * 컨테이너(standalone) 서버에서는 SIGTERM을 받아도 남은 콜백을 끝낸 뒤 종료합니다.
 * 그래서 실행 환경과 관계없이 응답이 작업을 기다리지 않습니다.
 *
 * @returns 요청 컨텍스트 안이면 `undefined` — 호출부가 await해도 즉시 넘어갑니다.
 *   요청 컨텍스트 밖(테스트·스크립트)에서 `after()`가 던지면 작업 자체를 돌려주므로,
 *   호출부가 await하면 작업이 끝날 때까지 기다립니다.
 */
export const runAfterResponse = (
	task: () => Promise<void>,
): Promise<void> | undefined => {
	const run = () =>
		task().catch((error) => {
			console.error("응답 뒤 작업에서 처리하지 못한 예외:", error);
		});

	try {
		after(run);

		return undefined;
	} catch (error) {
		console.warn("after()를 쓸 수 없어 응답 전에 마칩니다:", error);

		return run();
	}
};
