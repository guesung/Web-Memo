import type { TPersona } from "./markers.ts";
import { isQuestionMarker, parseMarker } from "./markers.ts";

/** GitHub 리뷰 코멘트 중 이 워크플로우가 사용하는 필드만 추린 형태 */
export interface IFReviewComment {
	/** 코멘트 ID. GitHub에서 생성 순으로 증가한다 */
	id: number;
	/** 답글인 경우 대상 코멘트 ID. 루트 코멘트면 null 또는 undefined */
	in_reply_to_id?: number | null;
	body: string;
	path: string;
	/** 파일 내 라인 번호. outdated 코멘트는 null이 될 수 있다 */
	line: number | null;
	user: { login: string };
	created_at: string;
}

/** 재답변이 필요한 스레드 */
export interface IFPendingThread {
	/** 스레드 루트 코멘트 ID. 답글을 달 때 사용한다 */
	rootId: number;
	persona: TPersona;
	path: string;
	line: number | null;
	/** 봇이 처음 던진 질문 본문 (마커 포함) */
	question: string;
	/** 작성자가 마지막으로 남긴 답변 본문 */
	authorReply: string;
}

/**
 * 답글 체인을 거슬러 올라가 스레드 루트 코멘트 ID를 찾는다.
 * @description GitHub는 답글의 답글에 직전 코멘트 ID를 넣을 수 있으므로
 * 한 단계만 보면 같은 스레드를 놓친다. 순환 참조는 방문 집합으로 방어한다.
 */
const resolveRootId = ({
	comment,
	byId,
}: {
	comment: IFReviewComment;
	byId: Map<number, IFReviewComment>;
}): number => {
	const visited = new Set<number>();
	let current = comment;

	while (current.in_reply_to_id !== null && current.in_reply_to_id !== undefined) {
		if (visited.has(current.id)) {
			break;
		}

		visited.add(current.id);

		const parent = byId.get(current.in_reply_to_id);

		if (parent === undefined) {
			break;
		}

		current = parent;
	}

	return current.id;
};

/**
 * 재답변이 필요한 스레드를 찾는다.
 * @description 스펙 §4.2의 세 조건을 모두 만족하는 스레드만 반환한다.
 * 1) 루트가 봇 코멘트(마커 보유), 2) 작성자 답글 존재,
 * 3) 작성자의 첫 답글 이후 같은 페르소나의 답글이 한 번도 없음.
 * 조건 3은 작성자의 "첫" 답글을 기준으로 판단한다 — 봇이 이미 한 번 답한 스레드는
 * 그 뒤에 작성자가 다시 답글을 달아도 재답변 대상이 되지 않는다(1회 제한이
 * 답글 사이클마다 리셋되지 않고 스레드 전체에서 영구히 적용됨). 반환되는
 * `authorReply`에는 (판단 기준과 별개로) 작성자의 "마지막" 답글 본문을 담아
 * 봇이 최신 맥락에 답하도록 한다.
 */
export const findPendingThreads = ({
	comments,
	prAuthor,
}: {
	comments: IFReviewComment[];
	prAuthor: string;
}): IFPendingThread[] => {
	const sorted = [...comments].sort((left, right) => left.id - right.id);
	const byId = new Map(sorted.map((comment) => [comment.id, comment]));
	const repliesByRoot = new Map<number, IFReviewComment[]>();
	const roots: IFReviewComment[] = [];

	for (const comment of sorted) {
		const rootId = resolveRootId({ comment, byId });

		if (rootId === comment.id) {
			roots.push(comment);
			continue;
		}

		const bucket = repliesByRoot.get(rootId) ?? [];
		bucket.push(comment);
		repliesByRoot.set(rootId, bucket);
	}

	const pending: IFPendingThread[] = [];

	for (const root of roots) {
		const marker = parseMarker(root.body);

		if (!isQuestionMarker(marker)) {
			continue;
		}

		const replies = repliesByRoot.get(root.id) ?? [];
		const authorReplies = replies.filter((reply) => reply.user.login === prAuthor);

		if (authorReplies.length === 0) {
			continue;
		}

		const firstAuthorIndex = replies.findIndex((reply) => reply.user.login === prAuthor);
		const hasBotReplyAfter = replies
			.slice(firstAuthorIndex + 1)
			.some((reply) => parseMarker(reply.body)?.persona === marker.persona);

		if (hasBotReplyAfter) {
			continue;
		}

		pending.push({
			rootId: root.id,
			persona: marker.persona,
			path: root.path,
			line: root.line,
			question: root.body,
			authorReply: authorReplies[authorReplies.length - 1].body,
		});
	}

	return pending;
};

/** 작성자가 아직 답하지 않은 봇 질문 스레드 */
export interface IFUnansweredThread {
	rootId: number;
	persona: TPersona;
	path: string;
	line: number | null;
	/** 봇이 던진 질문 본문 (마커 포함) */
	question: string;
}

/**
 * 작성자가 아직 답하지 않은 봇 질문 스레드를 찾는다.
 * @description `findPendingThreads`와 정반대 방향의 질의다. 그쪽은 "작성자가 답했으니
 * 봇이 재답변할 차례"인 스레드를 찾지만, 이쪽은 "봇이 물었는데 작성자가 아직 입을 열지
 * 않은" 스레드를 찾는다. 승인(`approve`) 게이트가 이 결과를 쓴다 — 하나라도 남아 있으면
 * 작성자가 자기 코드를 설명하지 않고 통과하려는 상황이므로 승인을 거부해야 한다.
 * 루트에 마커가 없는 스레드(사람이 직접 연 리뷰 스레드)는 이 워크플로우의 대상이
 * 아니므로 세지 않는다.
 */
export const findUnansweredThreads = ({
	comments,
	prAuthor,
}: {
	comments: IFReviewComment[];
	prAuthor: string;
}): IFUnansweredThread[] => {
	const sorted = [...comments].sort((left, right) => left.id - right.id);
	const byId = new Map(sorted.map((comment) => [comment.id, comment]));
	const repliesByRoot = new Map<number, IFReviewComment[]>();
	const roots: IFReviewComment[] = [];

	for (const comment of sorted) {
		const rootId = resolveRootId({ comment, byId });

		if (rootId === comment.id) {
			roots.push(comment);
			continue;
		}

		const bucket = repliesByRoot.get(rootId) ?? [];
		bucket.push(comment);
		repliesByRoot.set(rootId, bucket);
	}

	const unanswered: IFUnansweredThread[] = [];

	for (const root of roots) {
		const marker = parseMarker(root.body);

		if (!isQuestionMarker(marker)) {
			continue;
		}

		const replies = repliesByRoot.get(root.id) ?? [];
		const hasAuthorReply = replies.some((reply) => reply.user.login === prAuthor);

		if (hasAuthorReply) {
			continue;
		}

		unanswered.push({
			rootId: root.id,
			persona: marker.persona,
			path: root.path,
			line: root.line,
			question: root.body,
		});
	}

	return unanswered;
};
