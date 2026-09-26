import { readServerEnv } from "@src/utils/serverEnv";
import { APITimeoutError } from "@typesafe-ai/sdk";
import type {
	IFPastMemoRequest,
	IFPastMemoResponse,
} from "@web-memo/shared/types";
import { getRecentMemos } from "./getRecentMemos";
import { judgeWithJev } from "./judgeWithJev";
import { matchByLooseUrl } from "./matchByLooseUrl";
import { reportPastMemoFailure } from "./reportPastMemoFailure";

/**
 * 현재 페이지와 같은 글·관련 있는 글을 사용자의 과거 메모에서 찾는다.
 * @description 정확히 같은 URL의 메모는 후보에서 뺀다. 느슨한 URL 키가 같은 메모가 있으면 jev 없이 그 메모를
 * 중복(rule)으로 돌려주고, 없으면 jev로 판정한다. 어떤 단계가 실패해도 빈 결과로 끝나고(fail-open) Sentry에 보고한다.
 * TYPESAFE_API_KEY가 없으면 jev를 부르지 않고 빈 결과를 돌려준다.
 */
export const findPastMemo = async ({
	accessToken,
	userId,
	page,
}: {
	accessToken: string;
	userId: string;
	page: IFPastMemoRequest;
}): Promise<IFPastMemoResponse> => {
	const emptyResponse: IFPastMemoResponse = { duplicate: null, related: [] };

	let candidates: Awaited<ReturnType<typeof getRecentMemos>>;

	try {
		const recentMemos = await getRecentMemos({ accessToken, userId });

		candidates = recentMemos.filter((memo) => memo.url !== page.pageUrl);
	} catch (error) {
		reportPastMemoFailure({ error, stage: "fetch-memos" });

		return emptyResponse;
	}

	const ruleMatchedMemo = matchByLooseUrl({
		pageUrl: page.pageUrl,
		memos: candidates,
	});

	if (ruleMatchedMemo) {
		return {
			duplicate: {
				id: ruleMatchedMemo.id,
				title: ruleMatchedMemo.title,
				url: ruleMatchedMemo.url,
				source: "rule",
			},
			related: [],
		};
	}

	const apiKey = readServerEnv("TYPESAFE_API_KEY");

	if (!apiKey) {
		console.warn("TYPESAFE_API_KEY가 없어 과거 메모 jev 판정을 건너뜁니다");

		return emptyResponse;
	}

	try {
		return await judgeWithJev({ apiKey, page, memos: candidates });
	} catch (error) {
		// 타임아웃은 jev가 느린 것이지 고장은 아니므로 경고로 낮춘다.
		if (error instanceof APITimeoutError) {
			reportPastMemoFailure({ error, stage: "jev-timeout", level: "warning" });
		} else {
			reportPastMemoFailure({ error, stage: "jev" });
		}

		return emptyResponse;
	}
};
