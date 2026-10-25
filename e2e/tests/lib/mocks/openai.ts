import type { BrowserContext } from "@playwright/test";
import {
	STREAM_DATA_PREFIX,
	STREAM_DONE_MARKER,
} from "@web-memo/shared/constants";

/**
 * 요약 API(`POST /api/openai`)를 목 SSE로 가로채고 받은 요청 수를 센다.
 * @description 실제 OpenAI를 부르지 않도록 웹 서버에 닿기 전에 응답한다. 요청은 사이드 패널 페이지가 보내므로
 * 페이지가 아니라 컨텍스트에 건다. 패턴은 경로 끝까지 맞추므로 `/api/openai/category` 같은 하위 경로는 잡지 않는다.
 * 응답은 웹의 route handler와 같은 꼴(`data: {"content":…}` 줄들 뒤 `data: [DONE]`)로 조각마다 한 줄씩 보낸다.
 * @returns 지금까지 받은 요청 수를 읽는 함수.
 */
export const mockSummaryApi = async ({
	context,
	summaryChunks,
}: IFMockSummaryApiParams) => {
	let summaryRequestCount = 0;

	await context.route("**/api/openai", async (route) => {
		if (route.request().method() !== "POST") {
			await route.fallback();
			return;
		}

		summaryRequestCount += 1;
		const contentLines = summaryChunks.map(
			(chunk) =>
				`${STREAM_DATA_PREFIX}${JSON.stringify({ content: chunk })}\n\n`,
		);

		await route.fulfill({
			status: 200,
			contentType: "text/event-stream",
			body: `${contentLines.join("")}${STREAM_DATA_PREFIX}${STREAM_DONE_MARKER}\n\n`,
		});
	});

	return {
		getSummaryRequestCount: () => summaryRequestCount,
	};
};

/** {@link mockSummaryApi}의 인자. */
interface IFMockSummaryApiParams {
	/** 사이드 패널이 속한 브라우저 컨텍스트 */
	context: BrowserContext;
	/** 스트림으로 한 줄씩 보낼 요약 조각. 사이드 패널은 이것을 순서대로 이어 붙여 보여준다 */
	summaryChunks: string[];
}
