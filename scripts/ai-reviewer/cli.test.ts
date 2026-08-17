import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runFollowupWithItems, runPostWithInput, validatePostInput, withMarker } from "./cli.ts";
import { parseMarker } from "./markers.ts";
import type { TPersona } from "./markers.ts";

/**
 * 테스트에서만 쓰는 "가짜 persona" 상수.
 * @description LLM이 생성한 JSON에는 실제로 이런 값이 들어올 수 있지만, 타입 시스템은
 * `TPersona`가 "intern"|"senior"만 허용한다고 믿는다. 이 파일의 목적 자체가 "타입은
 * 맞다고 믿지만 런타임 값은 틀린" 입력을 검증하는 것이므로, 여기서만 좁은 범위로 캐스팅해
 * 컴파일을 통과시킨다(다른 프로덕션 코드의 타입 에러를 가리는 것과는 다르다).
 */
const INVALID_PERSONA = "junior" as unknown as TPersona;

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

describe("validatePostInput", () => {
	it("questions/replies/scan이 모두 유효하면 통과한다", () => {
		expect(() => {
			validatePostInput({
				questions: [
					{ persona: "intern", path: "a.ts", line: 1, body: "q", kind: "q1" },
					{ persona: "senior", path: "b.ts", line: 2, body: "q", kind: "q-2" },
				],
				replies: [{ persona: "intern", rootId: 1, body: "답글" }],
				scan: { persona: "senior", body: "요약" },
			});
		}).not.toThrow();
	});

	it("유효하지 않은 kind가 있으면 해당 항목을 모두 나열하며 throw한다", () => {
		let thrown: Error | undefined;

		try {
			validatePostInput({
				questions: [
					{ persona: "intern", path: "a.ts", line: 1, body: "q", kind: "q1" },
					{ persona: "senior", path: "b.ts", line: 2, body: "q", kind: "Q2!" },
					{ persona: "intern", path: "c.ts", line: 3, body: "q", kind: "질문" },
				],
				replies: [],
				scan: null,
			});
		} catch (error) {
			thrown = error as Error;
		}

		expect(thrown).toBeDefined();
		expect(thrown?.message).toContain("questions[1]");
		expect(thrown?.message).toContain("Q2!");
		expect(thrown?.message).toContain("questions[2]");
		expect(thrown?.message).toContain("질문");
	});

	it("questions에 유효하지 않은 persona가 있으면 인덱스를 명시하며 throw한다", () => {
		expect(() => {
			validatePostInput({
				questions: [
					// @ts-expect-error LLM이 생성한 JSON에는 persona가 틀린 값으로 올 수 있다
					{ persona: "junior", path: "a.ts", line: 1, body: "q", kind: "q1" },
				],
				replies: [],
				scan: null,
			});
		}).toThrow(/questions\[0\]\.persona/);
	});

	it("replies에 유효하지 않은 persona가 있으면 인덱스를 명시하며 throw한다", () => {
		expect(() => {
			validatePostInput({
				questions: [],
				// @ts-expect-error LLM이 생성한 JSON에는 persona가 틀린 값으로 올 수 있다
				replies: [{ persona: "junior", rootId: 1, body: "답글" }],
				scan: null,
			});
		}).toThrow(/replies\[0\]\.persona/);
	});

	it("scan.persona가 유효하지 않으면 throw한다", () => {
		expect(() => {
			validatePostInput({
				questions: [],
				replies: [],
				// @ts-expect-error LLM이 생성한 JSON에는 persona가 틀린 값으로 올 수 있다
				scan: { persona: "junior", body: "요약" },
			});
		}).toThrow(/scan\.persona/);
	});

	it("persona가 빈 문자열이면 거부한다", () => {
		expect(() => {
			validatePostInput({
				// @ts-expect-error LLM이 생성한 JSON에는 persona가 틀린 값으로 올 수 있다
				questions: [{ persona: "", path: "a.ts", line: 1, body: "q", kind: "q1" }],
				replies: [],
				scan: null,
			});
		}).toThrow(/questions\[0\]\.persona/);
	});

	it("kind와 persona가 동시에 잘못되면 하나의 에러 메시지에 둘 다 나열한다", () => {
		let thrown: Error | undefined;

		try {
			validatePostInput({
				questions: [
					// @ts-expect-error LLM이 생성한 JSON에는 persona가 틀린 값으로 올 수 있다
					{ persona: "junior", path: "a.ts", line: 1, body: "q", kind: "bad kind!" },
				],
				replies: [],
				scan: null,
			});
		} catch (error) {
			thrown = error as Error;
		}

		expect(thrown).toBeDefined();
		expect(thrown?.message).toContain("questions[0].persona");
		expect(thrown?.message).toContain("questions[0].kind");
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

	it("questions 중 하나라도 persona가 잘못되면 어떤 게시 함수도 호출하지 않고 throw한다", async () => {
		const input = {
			questions: [{ persona: INVALID_PERSONA, path: "a.ts", line: 1, body: "q1", kind: "q1" }],
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await expect(runPostWithInput({ pullNumber: 1, input })).rejects.toThrow(
			/questions\[0\]\.persona/,
		);

		expect(githubMocks.getPullRequest).not.toHaveBeenCalled();
		expect(githubMocks.postReviewComment).not.toHaveBeenCalled();
	});

	it("replies 중 하나라도 persona가 잘못되면 어떤 게시 함수도 호출하지 않고 throw한다", async () => {
		const input = {
			replies: [{ persona: INVALID_PERSONA, rootId: 1, body: "답글" }],
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await expect(runPostWithInput({ pullNumber: 1, input })).rejects.toThrow(
			/replies\[0\]\.persona/,
		);

		expect(githubMocks.postReviewReply).not.toHaveBeenCalled();
	});

	it("scan.persona가 잘못되면 어떤 게시 함수도 호출하지 않고 throw한다", async () => {
		const input = {
			scan: { persona: INVALID_PERSONA, body: "요약" },
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await expect(runPostWithInput({ pullNumber: 1, input })).rejects.toThrow(/scan\.persona/);

		expect(githubMocks.postIssueComment).not.toHaveBeenCalled();
	});

	it("게시 도중 실패하면 지점을 명시한 진단 메시지를 stderr에 남기고 원본 에러를 그대로 던진다", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		githubMocks.getPullRequest.mockResolvedValue({ headSha: "sha1", body: "" });
		githubMocks.postReviewComment
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("GitHub API 500"));

		const input = {
			questions: [
				{ persona: "intern", path: "a.ts", line: 1, body: "q1", kind: "q1" },
				{ persona: "senior", path: "b.ts", line: 2, body: "q2", kind: "q2" },
			],
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await expect(runPostWithInput({ pullNumber: 1, input })).rejects.toThrow("GitHub API 500");

		const loggedLines = consoleErrorSpy.mock.calls.map((call) => call[0]);
		expect(
			loggedLines.some((line) => typeof line === "string" && line.includes("questions[1]")),
		).toBe(true);
		expect(loggedLines.some((line) => typeof line === "string" && line.includes("1/2"))).toBe(true);

		consoleErrorSpy.mockRestore();
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

	it("질문마다 몇 번째/전체 건수인지 stderr 진행 로그에 명시한다", async () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		githubMocks.getPullRequest.mockResolvedValue({ headSha: "sha1", body: "" });

		const input = {
			questions: [
				{ persona: "intern", path: "a.ts", line: 1, body: "q1", kind: "q1" },
				{ persona: "senior", path: "b.ts", line: 2, body: "q2", kind: "q2" },
			],
		} satisfies Parameters<typeof runPostWithInput>[0]["input"];

		await runPostWithInput({ pullNumber: 412, input });

		const loggedLines = consoleErrorSpy.mock.calls.map((call) => call[0]);
		expect(loggedLines.some((line) => typeof line === "string" && line.includes("1/2"))).toBe(true);
		expect(loggedLines.some((line) => typeof line === "string" && line.includes("2/2"))).toBe(true);

		consoleErrorSpy.mockRestore();
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
