import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runFollowupWithItems, runPostWithInput, validateQuestionKinds, withMarker } from "./cli.ts";
import { parseMarker } from "./markers.ts";

const githubMocks = vi.hoisted(() => {
	return {
		getPullRequest: vi.fn(),
		listReviewComments: vi.fn(),
		postIssueComment: vi.fn(),
		postReviewComment: vi.fn(),
		postReviewReply: vi.fn(),
		updatePullRequestBody: vi.fn(),
	};
});

vi.mock("./github.ts", () => githubMocks);

vi.mock("./appToken.ts", () => {
	return {
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

afterEach(() => {
	vi.clearAllMocks();
});

describe("withMarker", () => {
	it("본문 끝에 마커를 빈 줄로 구분해 붙이고, parseMarker로 라운드트립된다", () => {
		const result = withMarker({ body: "질문입니다.  \n", persona: "intern", kind: "q1" });

		expect(result).toBe("질문입니다.\n\n<!-- ai-review:intern:q1 -->");
		expect(parseMarker(result)).toEqual({ persona: "intern", kind: "q1" });
	});
});

describe("validateQuestionKinds", () => {
	it("모든 kind가 유효하면 통과한다", () => {
		expect(() => {
			validateQuestionKinds([
				{ persona: "intern", path: "a.ts", line: 1, body: "q", kind: "q1" },
				{ persona: "senior", path: "b.ts", line: 2, body: "q", kind: "q-2" },
			]);
		}).not.toThrow();
	});

	it("유효하지 않은 kind가 있으면 해당 항목을 모두 나열하며 throw한다", () => {
		let thrown: Error | undefined;

		try {
			validateQuestionKinds([
				{ persona: "intern", path: "a.ts", line: 1, body: "q", kind: "q1" },
				{ persona: "senior", path: "b.ts", line: 2, body: "q", kind: "Q2!" },
				{ persona: "intern", path: "c.ts", line: 3, body: "q", kind: "질문" },
			]);
		} catch (error) {
			thrown = error as Error;
		}

		expect(thrown).toBeDefined();
		expect(thrown?.message).toContain("#1");
		expect(thrown?.message).toContain("Q2!");
		expect(thrown?.message).toContain("#2");
		expect(thrown?.message).toContain("질문");
	});
});

describe("runPostWithInput", () => {
	it("질문 중 하나라도 kind가 잘못되면 어떤 게시 함수도 호출하지 않고 throw한다", async () => {
		const input = {
			questions: [
				{ persona: "intern", path: "a.ts", line: 1, body: "q1", kind: "q1" },
				{ persona: "senior", path: "b.ts", line: 2, body: "q2", kind: "bad kind!" },
			],
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await expect(runPostWithInput({ pullNumber: 1, input })).rejects.toThrow();

		expect(githubMocks.getPullRequest).not.toHaveBeenCalled();
		expect(githubMocks.postReviewComment).not.toHaveBeenCalled();
	});

	it("유효한 배치는 questions → replies → scan 순서로 순차 게시한다", async () => {
		githubMocks.getPullRequest.mockResolvedValue({ headSha: "sha1", body: "" });

		const input = {
			questions: [{ persona: "intern", path: "a.ts", line: 1, body: "질문", kind: "q1" }],
			replies: [{ persona: "senior", rootId: 10, body: "답글" }],
			scan: { persona: "senior", body: "요약" },
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await runPostWithInput({ pullNumber: 412, input });

		expect(githubMocks.postReviewComment).toHaveBeenCalledTimes(1);
		expect(githubMocks.postReviewReply).toHaveBeenCalledTimes(1);
		expect(githubMocks.postIssueComment).toHaveBeenCalledTimes(1);
	});

	it("questions/replies/scan이 모두 없는 입력은 아무것도 하지 않고 throw하지 않는다", async () => {
		await expect(runPostWithInput({ pullNumber: 412, input: {} })).resolves.toBeUndefined();

		expect(githubMocks.getPullRequest).not.toHaveBeenCalled();
		expect(githubMocks.postReviewComment).not.toHaveBeenCalled();
		expect(githubMocks.postReviewReply).not.toHaveBeenCalled();
		expect(githubMocks.postIssueComment).not.toHaveBeenCalled();
	});
});

describe("runFollowupWithItems", () => {
	it("items가 빈 배열이면 API를 호출하지 않는다", async () => {
		await runFollowupWithItems({ pullNumber: 412, items: [] });

		expect(githubMocks.getPullRequest).not.toHaveBeenCalled();
		expect(githubMocks.updatePullRequestBody).not.toHaveBeenCalled();
	});

	it("신규 항목이 있으면 PR 본문을 갱신한다", async () => {
		githubMocks.getPullRequest.mockResolvedValue({ headSha: "sha1", body: "## 작업 내용" });

		await runFollowupWithItems({ pullNumber: 412, items: ["후속 작업 A"] });

		expect(githubMocks.updatePullRequestBody).toHaveBeenCalledTimes(1);
		const [{ body }] = githubMocks.updatePullRequestBody.mock.calls[0];
		expect(body).toContain("후속 작업 A");
	});
});

describe("CLI 인자 검증 (실제 서브프로세스 실행)", () => {
	const cliPath = fileURLToPath(new URL("./cli.ts", import.meta.url));

	it("알 수 없는 서브커맨드는 에러 메시지와 함께 exit code 1을 반환한다", () => {
		const result = spawnSync("node", [cliPath, "bogus", "--pr", "1"], { encoding: "utf8" });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("알 수 없는 서브커맨드: bogus (pending | post | followup)");
	});

	it("--pr 이 없으면 에러 메시지와 함께 exit code 1을 반환한다", () => {
		const result = spawnSync("node", [cliPath, "pending"], { encoding: "utf8" });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("--pr <번호> 가 필요합니다.");
	});

	it("--pr 값이 숫자가 아니면 에러 메시지와 함께 exit code 1을 반환한다", () => {
		const result = spawnSync("node", [cliPath, "pending", "--pr", "abc"], { encoding: "utf8" });

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("--pr 값이 숫자가 아닙니다: abc");
	});
});
