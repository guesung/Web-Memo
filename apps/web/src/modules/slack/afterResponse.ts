import { waitUntil } from "@vercel/functions";

/**
 * 응답을 보낸 뒤에도 끝까지 살아 있어야 하는 작업을 넘깁니다.
 *
 * @description Slack은 3초 안에 응답을 못 받으면 사용자에게 실패로 표시합니다.
 * 버전 커밋(Git Data API 6왕복) + 배포 실행은 그 예산에 들어가지 않아 응답 뒤로
 * 미뤄야 하는데, 서버리스 함수는 응답을 보내는 순간 종료될 수 있어 그냥 await를
 * 빼면 작업이 중간에 잘립니다. `waitUntil`이 그 사이를 잡아 줍니다.
 *
 * @returns Vercel 위에서는 `undefined` — 호출부가 await해도 즉시 넘어갑니다.
 *   `waitUntil` 컨텍스트가 없는 로컬 개발에서는 작업 자체를 돌려주므로,
 *   호출부가 await하면 응답이 조금 늦어질 뿐 작업은 온전히 끝납니다.
 */
export const runAfterResponse = (
	task: () => Promise<void>,
): Promise<void> | undefined => {
	// task()를 먼저 한 번만 부릅니다. waitUntil이 던진 뒤 다시 부르면 두 번 실행됩니다.
	const running = task().catch((error) => {
		console.error("응답 뒤 작업에서 처리하지 못한 예외:", error);
	});

	// Vercel 밖에는 waitUntil 컨텍스트가 없습니다. 여기서 넘겨봐야 작업은 그대로 죽습니다.
	if (!process.env.VERCEL) return running;

	try {
		waitUntil(running);

		return undefined;
	} catch (error) {
		console.warn("waitUntil을 쓸 수 없어 응답 전에 마칩니다:", error);

		return running;
	}
};
