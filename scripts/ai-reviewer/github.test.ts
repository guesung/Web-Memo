import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getPullRequest,
	listReviewComments,
	postIssueComment,
	postReviewComment,
	postReviewReply,
} from "./github.ts";

vi.mock("./appToken.ts", () => {
	return {
		issueInstallationToken: async () => "ghs_test_token",
		loadReviewerConfig: () => {
			return {
				repo: "guesung/web-memo",
				prAuthor: "guesung",
				bots: {
					intern: { displayName: "이도현", role: "인턴 개발자" },
					senior: { displayName: "박성우", role: "시니어 개발자" },
				},
			};
		},
	};
});

const jsonResponse = (data: unknown): Response => {
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("listReviewComments", () => {
	it("페이지네이션을 따라가 모든 코멘트를 모은다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))))
			.mockResolvedValueOnce(jsonResponse([{ id: 101 }]));
		vi.stubGlobal("fetch", fetchMock);

		const comments = await listReviewComments(412);

		expect(comments).toHaveLength(101);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("Authorization 헤더에 발급받은 토큰을 넣는다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal("fetch", fetchMock);

		await listReviewComments(412);

		const [, init] = fetchMock.mock.calls[0];
		expect(init.headers.Authorization).toBe("Bearer ghs_test_token");
	});

	it("코멘트가 정확히 PAGE_SIZE(100)개면 다음 페이지를 조회하고서 멈춘다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))))
			.mockResolvedValueOnce(jsonResponse([]));
		vi.stubGlobal("fetch", fetchMock);

		const comments = await listReviewComments(412);

		expect(comments).toHaveLength(100);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("코멘트가 없는 PR이면 추가 요청 없이 빈 배열을 반환한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
		vi.stubGlobal("fetch", fetchMock);

		const comments = await listReviewComments(412);

		expect(comments).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe("getPullRequest", () => {
	it("body가 null이면 빈 문자열로 변환한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({ head: { sha: "abc123" }, body: null }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const pull = await getPullRequest(412);

		expect(pull).toEqual({ headSha: "abc123", body: "" });
	});
});

describe("postReviewComment", () => {
	it("commit_id, path, line, side: RIGHT 를 담아 comments 엔드포인트로 POST 한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
		vi.stubGlobal("fetch", fetchMock);

		await postReviewComment({
			persona: "senior",
			pullNumber: 412,
			path: "src/index.ts",
			line: 10,
			body: "지적",
			commitSha: "deadbeef",
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain("/repos/guesung/web-memo/pulls/412/comments");
		expect(url).not.toContain("/comments/");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({
			commit_id: "deadbeef",
			path: "src/index.ts",
			line: 10,
			side: "RIGHT",
			body: "지적",
		});
	});
});

describe("postIssueComment", () => {
	it("pulls가 아니라 issues/{n}/comments 엔드포인트로 POST 한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
		vi.stubGlobal("fetch", fetchMock);

		await postIssueComment({ persona: "senior", pullNumber: 412, body: "요약" });

		const [url] = fetchMock.mock.calls[0];
		expect(url).toContain("/repos/guesung/web-memo/issues/412/comments");
		expect(url).not.toContain("/pulls/412/comments");
	});
});

describe("postReviewReply", () => {
	it("루트 코멘트의 replies 엔드포인트로 POST 한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 999 }));
		vi.stubGlobal("fetch", fetchMock);

		await postReviewReply({ persona: "intern", pullNumber: 412, rootId: 77, body: "답글" });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toContain("/repos/guesung/web-memo/pulls/412/comments/77/replies");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({ body: "답글" });
	});

	it("에러 응답이면 상태 코드를 담아 예외를 던진다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })),
		);

		await expect(
			postReviewReply({ persona: "intern", pullNumber: 412, rootId: 77, body: "답글" }),
		).rejects.toThrow(/404/);
	});

	it("에러 메시지에 Authorization 토큰이 노출되지 않는다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })),
		);

		await expect(
			postReviewReply({ persona: "intern", pullNumber: 412, rootId: 77, body: "답글" }),
		).rejects.not.toThrow(/ghs_test_token/);
	});
});
