import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import type {
	IFPastMemoDuplicate,
	IFPastMemoRequest,
	IFPastMemoResponse,
} from "@web-memo/shared/types";
import type { IFRecentMemo } from "./getRecentMemos";

/**
 * jev로 현재 페이지와 같은 글·관련 있는 글을 고른다.
 * @description 1단계 Choice로 후보를 상위 5개까지 추리고, 2단계에서 후보마다 Noul(같은 글인가)과
 * Score(얼마나 관련 있는가)를 한 요청으로 묻는다. 후보 id는 P0..처럼 로컬 라벨로 바꿔 보내고 실제 id는 서버에만 둔다.
 * 후보가 없으면 jev를 부르지 않는다. jev 호출 실패·타임아웃은 그대로 던진다.
 */
export const judgeWithJev = async ({
	apiKey,
	page,
	memos,
}: {
	apiKey: string;
	page: IFPastMemoRequest;
	memos: IFRecentMemo[];
}): Promise<IFPastMemoResponse> => {
	if (memos.length === 0) {
		return { duplicate: null, related: [] };
	}

	const client = new TypeSafeClient({
		apiKey,
		timeout: 2500,
		retry: { maxRetries: 0 },
	});
	const state = {
		page: {
			title: page.pageTitle,
			url: page.pageUrl,
			excerpt: page.pageExcerpt,
		},
	};
	const memoByLabel = new Map<string, IFRecentMemo>(
		memos.map((memo, index) => [`P${index}`, memo]),
	);

	const shortlistCriteria: Record<string, string> = {
		none: "None of the saved notes relate to this page",
	};

	for (const [label, memo] of memoByLabel) {
		shortlistCriteria[label] = `${memo.title} — ${memo.url}`;
	}

	const shortlistResult = await client.systemOne({
		state,
		questions: {
			closest: choice(
				"Which saved note is about the same article as the current page, or the most closely related topic?",
				shortlistCriteria,
			),
		},
	});

	const shortlistedLabels = Object.entries(
		shortlistResult.answers.closest.probabilities,
	)
		.filter(
			([label, probability]) =>
				label !== "none" && memoByLabel.has(label) && probability >= 0.02,
		)
		.sort(([, probabilityA], [, probabilityB]) => probabilityB - probabilityA)
		.slice(0, 5)
		.map(([label]) => label);

	if (shortlistedLabels.length === 0) {
		return { duplicate: null, related: [] };
	}

	const detailQuestions: Record<
		string,
		ReturnType<typeof noul> | ReturnType<typeof score>
	> = {};

	for (const label of shortlistedLabels) {
		const memo = memoByLabel.get(label);

		if (!memo) {
			continue;
		}

		const note = { title: memo.title, url: memo.url };

		detailQuestions[`same_${label}`] = noul({
			question:
				"Is this saved note about the same article/video as the current page (just a different URL)?",
			note,
		});
		detailQuestions[`related_${label}`] = score(
			{
				question: "How related is this saved note's topic to the current page?",
				note,
			},
			[
				"Unrelated",
				"Same broad field only",
				"Closely related topic",
				"Directly about the same subject",
			],
		);
	}

	const detailResult = await client.systemOne({
		state,
		questions: detailQuestions,
	});
	const detailAnswers = detailResult.answers;

	let duplicateLabel: string | null = null;
	let duplicateNoul = 0;

	for (const label of shortlistedLabels) {
		const sameAnswer = detailAnswers[`same_${label}`];

		if (sameAnswer?.type !== "noul") {
			continue;
		}

		if (sameAnswer.noul >= 0.85 && sameAnswer.noul > duplicateNoul) {
			duplicateLabel = label;
			duplicateNoul = sameAnswer.noul;
		}
	}

	const relatedLabels = shortlistedLabels
		.flatMap((label) => {
			const relatedAnswer = detailAnswers[`related_${label}`];

			if (label === duplicateLabel || relatedAnswer?.type !== "score") {
				return [];
			}

			// 4단계(0~3) 중 상위 2단계("Closely related topic" 이상)이면서 확신이 충분한 것만 관련으로 본다.
			if (relatedAnswer.score < 2 || relatedAnswer.confidence < 0.7) {
				return [];
			}

			return [{ label, score: relatedAnswer.score }];
		})
		.sort((relatedA, relatedB) => relatedB.score - relatedA.score)
		.slice(0, 3);

	let duplicate: IFPastMemoDuplicate | null = null;
	const duplicateMemo = duplicateLabel && memoByLabel.get(duplicateLabel);

	if (duplicateMemo) {
		duplicate = {
			id: duplicateMemo.id,
			title: duplicateMemo.title,
			url: duplicateMemo.url,
			source: "jev",
		};
	}

	return {
		duplicate,
		related: relatedLabels.flatMap(({ label }) => {
			const memo = memoByLabel.get(label);

			if (!memo) {
				return [];
			}

			return [
				{
					id: memo.id,
					title: memo.title,
					url: memo.url,
					favIconUrl: memo.favIconUrl,
					updatedAt: memo.updated_at,
				},
			];
		}),
	};
};
