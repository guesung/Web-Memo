import { readServerEnv } from "@src/utils/serverEnv";
import { APITimeoutError } from "@typesafe-ai/sdk";
import type {
	IFPastMemoRequest,
	IFPastMemoResponse,
} from "@web-memo/shared/types";
import { getMemoPage, type IFMemoCandidate } from "./getMemoPage";
import { judgeWithJev } from "./judgeWithJev";
import { buildLooseUrlPattern } from "./looseUrlPattern";
import { matchByLooseUrl } from "./matchByLooseUrl";
import { reportPastMemoFailure } from "./reportPastMemoFailure";

/** jev 판정 후보로 보내는 최근 메모 수 */
const RECENT_PAGE_SIZE = 200;
/** URL 패턴으로 좁힌 규칙 일치 후보 수. 같은 글은 보통 한두 건이라 넉넉하다 */
const RULE_PAGE_SIZE = 50;

/**
 * 현재 페이지와 같은 글·관련 있는 글을 사용자의 과거 메모에서 찾는다.
 * @description 정확히 같은 URL의 메모는 후보에서 뺀다. 느슨한 URL 키가 같은 메모가 있으면 jev 없이 그 메모를
 * 중복(rule)으로 돌려준다. 규칙 일치는 최근 200개에서 먼저 찾고, 없으면 호스트·경로 패턴으로 서버에서 좁힌
 * 오래된 메모에서 찾는다. 전체 메모를 끝까지 읽지 않는다 — 메모가 수천 건인 사용자는 페이지마다 수 MB가 나갔다.
 * 규칙 일치가 없으면 최근 200개만 jev로 판정한다. 어떤 단계가 실패해도 빈 결과로 끝나고(fail-open) Sentry에 보고한다.
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

	let candidates: IFMemoCandidate[] = [];

	try {
		const recentMemos = await getMemoPage({
			accessToken,
			userId,
			offset: 0,
			pageSize: RECENT_PAGE_SIZE,
		});
		candidates = excludeExactUrl(recentMemos, page.pageUrl);

		const recentMatch = matchByLooseUrl({
			pageUrl: page.pageUrl,
			memos: candidates,
		});

		if (recentMatch) {
			return toRuleDuplicate(recentMatch);
		}

		const urlPattern = buildLooseUrlPattern(page.pageUrl);

		if (urlPattern && recentMemos.length === RECENT_PAGE_SIZE) {
			const olderMemos = await getMemoPage({
				accessToken,
				userId,
				offset: 0,
				pageSize: RULE_PAGE_SIZE,
				urlPattern,
			});
			const olderMatch = matchByLooseUrl({
				pageUrl: page.pageUrl,
				memos: excludeExactUrl(olderMemos, page.pageUrl),
			});

			if (olderMatch) {
				return toRuleDuplicate(olderMatch);
			}
		}
	} catch (error) {
		reportPastMemoFailure({ error, stage: "fetch-memos" });

		return emptyResponse;
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

const excludeExactUrl = (memos: IFMemoCandidate[], pageUrl: string) =>
	memos.filter((memo) => memo.url !== pageUrl);

const toRuleDuplicate = (memo: IFMemoCandidate): IFPastMemoResponse => ({
	duplicate: {
		id: memo.id,
		title: memo.title,
		url: memo.url,
		source: "rule",
	},
	related: [],
});
