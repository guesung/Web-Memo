import { BLOG_CATALOG } from "@web-memo/shared/constants/blog-catalog";
import type {
	TBlogId,
	TBlogSourceViewState,
} from "@web-memo/shared/types/blog-reading";

/** 블로그 id의 한국어 표시명. 목록에 없는 id면 id를 그대로 돌려준다. */
export function getBlogDisplayName(blogId: TBlogId): string {
	return (
		BLOG_CATALOG.find((blog) => blog.blogId === blogId)?.displayName.ko ??
		blogId
	);
}

/** 소스 수집 상태 카드에 보여 줄 문구 */
export interface IFBlogSourceStatusCopy {
	title: string;
	description: string;
	/** 확보한 글을 먼저 읽을 수 있다는 보조 안내. 전체 수집이 끝났으면 null */
	hint: string | null;
}

/**
 * 수집 상태를 사용자 문구로 바꾼다.
 * @description 전체 수집이 끝나기 전에는 현재 개수만 말하고 총 글 수·퍼센트를 말하지 않는다.
 * 총 글 수는 서버가 확정해 `total`을 준 상태(complete·refreshing·refreshFailed)에서만 보여 준다.
 */
export function getBlogSourceStatusCopy(params: {
	blogName: string;
	viewState: TBlogSourceViewState;
	collectedCount: number;
	total: number | null;
}): IFBlogSourceStatusCopy {
	const { blogName, viewState, collectedCount, total } = params;
	const collectingDescription = `현재 ${collectedCount}개를 찾았어요. 전체 글 수는 확인 중이에요.`;
	const collectedHint = "먼저 가져온 글부터 읽고 메모할 수 있어요.";
	const totalDescription =
		total === null
			? `현재 ${collectedCount}개를 모았어요.`
			: `공개된 글 총 ${total}개를 모았어요.`;

	switch (viewState) {
		case "complete":
			return {
				title: `${blogName} · 전체 글 수집 완료`,
				description: totalDescription,
				hint: null,
			};
		case "refreshing":
			return {
				title: `${blogName} · 새 글을 확인하고 있어요`,
				description: totalDescription,
				hint: null,
			};
		case "refreshFailed":
			return {
				title: `${blogName} · 새 글을 확인하지 못했어요`,
				description: `${totalDescription} 이전에 수집한 글은 계속 볼 수 있어요.`,
				hint: null,
			};
		case "partialFailed":
			return {
				title: `${blogName} · 일부 글을 가져오지 못했어요`,
				description: collectingDescription,
				hint: collectedHint,
			};
		case "resumeQueued":
			return {
				title: `${blogName} · 수집 재개를 요청했어요`,
				description: `${collectingDescription} 다음 예약 작업에서 이어서 수집해요. 예약 작업은 15분마다 요청을 확인해요. 실행 상황에 따라 더 걸릴 수 있어요.`,
				hint: collectedHint,
			};
		case "waiting":
			return {
				title: `${blogName} · 수집을 기다리고 있어요`,
				description: "구독은 저장되어 있어요. 곧 글을 모으기 시작해요.",
				hint: null,
			};
		case "collecting":
			return {
				title: `${blogName} · 이전 글을 모으고 있어요`,
				description: collectingDescription,
				hint: collectedHint,
			};
	}
}
