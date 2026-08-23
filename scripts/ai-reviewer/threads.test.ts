import { describe, expect, it } from "vitest";
import type { IFReviewComment } from "./threads.ts";
import { findPendingThreads, findUnansweredThreads } from "./threads.ts";

const PR_AUTHOR = "guesung";

const makeComment = (overrides: Partial<IFReviewComment> & { id: number }): IFReviewComment => {
	return {
		in_reply_to_id: null,
		body: "",
		path: "src/foo.ts",
		line: 10,
		user: { login: "lee-dohyun[bot]" },
		created_at: "2026-08-17T00:00:00Z",
		...overrides,
	};
};

describe("findPendingThreads", () => {
	it("작성자가 답변했고 봇이 아직 재답변하지 않은 스레드를 찾는다", () => {
		const comments = [
			makeComment({ id: 1, body: "이 코드 뭔가요?\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "캐시 때문입니다", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([
			{
				rootId: 1,
				persona: "intern",
				path: "src/foo.ts",
				line: 10,
				question: "이 코드 뭔가요?\n<!-- ai-review:intern:q1 -->",
				authorReply: "캐시 때문입니다",
			},
		]);
	});

	it("작성자 답변이 없으면 대상이 아니다 (조건 2)", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("작성자 답변 이후 같은 봇이 이미 답했으면 대상이 아니다 (조건 3 = 1턴 제한)", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "이해했습니다\n<!-- ai-review:intern:reply -->" }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("봇 재답변 뒤에 작성자가 또 답글을 달아도 다시 대상이 되지 않는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "이해했습니다\n<!-- ai-review:intern:reply -->" }),
			makeComment({ id: 4, in_reply_to_id: 1, body: "추가로 한마디", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("루트가 봇 코멘트가 아니면 대상이 아니다 (조건 1)", () => {
		const comments = [
			makeComment({ id: 1, body: "사람이 단 리뷰 코멘트", user: { login: "other-dev" } }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("작성자가 여러 번 답변하면 마지막 답변을 사용한다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:senior:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "첫 답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "정정합니다", user: { login: PR_AUTHOR } }),
		];

		const result = findPendingThreads({ comments, prAuthor: PR_AUTHOR });

		expect(result).toHaveLength(1);
		expect(result[0].authorReply).toBe("정정합니다");
		expect(result[0].persona).toBe("senior");
	});

	it("답글의 답글도 같은 스레드로 묶는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "중간 답글" }),
			makeComment({ id: 3, in_reply_to_id: 2, body: "작성자 답변", user: { login: PR_AUTHOR } }),
		];

		const result = findPendingThreads({ comments, prAuthor: PR_AUTHOR });

		expect(result).toHaveLength(1);
		expect(result[0].rootId).toBe(1);
		expect(result[0].authorReply).toBe("작성자 답변");
	});

	it("다른 페르소나의 재답변은 조건 3을 만족시키지 않는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, in_reply_to_id: 1, body: "끼어들기\n<!-- ai-review:senior:reply -->" }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toHaveLength(1);
	});

	it("여러 스레드를 동시에 처리한다", () => {
		const comments = [
			makeComment({ id: 1, body: "인턴 질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변1", user: { login: PR_AUTHOR } }),
			makeComment({ id: 3, path: "src/bar.ts", line: 20, body: "시니어 질문\n<!-- ai-review:senior:q1 -->" }),
			makeComment({ id: 4, in_reply_to_id: 3, body: "답변2", user: { login: PR_AUTHOR } }),
			makeComment({ id: 5, body: "미답변 질문\n<!-- ai-review:intern:q2 -->" }),
		];

		const result = findPendingThreads({ comments, prAuthor: PR_AUTHOR });

		expect(result.map((thread) => thread.rootId)).toEqual([1, 3]);
	});

	it("코멘트 순서가 뒤섞여 들어와도 id 오름차순으로 판단한다", () => {
		const comments = [
			makeComment({ id: 3, in_reply_to_id: 1, body: "이해했습니다\n<!-- ai-review:intern:reply -->" }),
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("in_reply_to_id가 입력 배열에 없는 코멘트를 가리켜도 죽지 않는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 99, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("in_reply_to_id가 순환 참조를 이뤄도 무한 루프 없이 종료한다", () => {
		const comments = [
			makeComment({ id: 1, in_reply_to_id: 2, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(() => findPendingThreads({ comments, prAuthor: PR_AUTHOR })).not.toThrow();
		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("코멘트가 하나도 없으면 빈 배열을 반환한다", () => {
		expect(findPendingThreads({ comments: [], prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("작성자와 봇 로그인이 같아도 죽지 않는다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->", user: { login: PR_AUTHOR } }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "답변", user: { login: PR_AUTHOR } }),
		];

		expect(() => findPendingThreads({ comments, prAuthor: PR_AUTHOR })).not.toThrow();
		expect(findPendingThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([
			{
				rootId: 1,
				persona: "intern",
				path: "src/foo.ts",
				line: 10,
				question: "질문\n<!-- ai-review:intern:q1 -->",
				authorReply: "답변",
			},
		]);
	});
});

describe("findUnansweredThreads", () => {
	it("작성자가 아직 답하지 않은 봇 질문을 찾는다", () => {
		const comments = [makeComment({ id: 1, body: "이 코드 뭔가요?\n<!-- ai-review:intern:q1 -->" })];

		expect(findUnansweredThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([
			{
				rootId: 1,
				persona: "intern",
				path: "src/foo.ts",
				line: 10,
				question: "이 코드 뭔가요?\n<!-- ai-review:intern:q1 -->",
			},
		]);
	});

	it("작성자가 답했으면 대상이 아니다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "캐시 때문입니다", user: { login: PR_AUTHOR } }),
		];

		expect(findUnansweredThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("봇끼리만 주고받은 스레드는 여전히 미답변이다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "거들기\n<!-- ai-review:senior:q1 -->" }),
		];

		expect(findUnansweredThreads({ comments, prAuthor: PR_AUTHOR })).toHaveLength(1);
	});

	it("마커가 없는 스레드는 이 워크플로우 대상이 아니라 세지 않는다", () => {
		const comments = [makeComment({ id: 1, body: "사람이 직접 남긴 리뷰 코멘트" })];

		expect(findUnansweredThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});

	it("답글의 답글로 이어진 작성자 답변도 인식한다", () => {
		const comments = [
			makeComment({ id: 1, body: "질문\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 2, in_reply_to_id: 1, body: "되묻기\n<!-- ai-review:intern:q1 -->" }),
			makeComment({ id: 3, in_reply_to_id: 2, body: "답변합니다", user: { login: PR_AUTHOR } }),
		];

		expect(findUnansweredThreads({ comments, prAuthor: PR_AUTHOR })).toEqual([]);
	});
});
