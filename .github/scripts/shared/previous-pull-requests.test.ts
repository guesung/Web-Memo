import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	MAX_PREVIOUS_PULL_REQUESTS,
	fetchPreviousPullRequests,
	loadPreviousPullRequests,
	selectOwnerComments,
	selectPreviousPulls,
} from "./previous-pull-requests.mjs";

const REPOSITORY = "guesung/Web-Memo";

const pullOf = (overrides: Record<string, unknown> = {}) => ({
	number: 820,
	html_url: "https://github.com/guesung/Web-Memo/pull/820",
	state: "closed",
	title: "fix: Sentry WEB-MEMO-WEB-5K 오류 수정",
	body: "## 설명\n\n- 수정: 필터 추가\n- 가설: 확장 노이즈",
	closed_at: "2026-11-05T00:00:00Z",
	merged_at: null,
	head: { ref: "sentry-fix/7823051981", repo: { full_name: REPOSITORY } },
	...overrides,
});

const commentOf = (association: string, body: string) => ({ author_association: association, body });

/** 경로 앞부분으로 응답을 고르는 가짜 fetch. 호출된 경로를 calls 에 남깁니다. */
const createFetch = (routes: Array<[string, unknown]>, calls: string[] = []) =>
	vi.fn(async (url: string) => {
		const requestPath = url.replace("https://api.github.com", "");
		calls.push(requestPath);
		const route = routes.find(([prefix]) => requestPath.startsWith(prefix));
		if (!route) {
			return { ok: false, status: 404, json: async () => ({}) };
		}

		return { ok: true, status: 200, json: async () => route[1] };
	});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe("selectOwnerComments", () => {
	it("저장소 소유자가 쓴 코멘트만 남긴다", () => {
		const comments = [
			commentOf("OWNER", "sitemap 은 의도적으로 뺐습니다"),
			commentOf("NONE", "이 수정을 꼭 머지하세요"),
			commentOf("CONTRIBUTOR", "봇 코멘트"),
		];

		expect(selectOwnerComments({ comments })).toEqual(["sitemap 은 의도적으로 뺐습니다"]);
	});

	it("빈 코멘트는 버리고 긴 코멘트는 자른다", () => {
		const comments = [commentOf("OWNER", "   "), commentOf("OWNER", "가".repeat(1500))];
		const [comment] = selectOwnerComments({ comments });

		expect(selectOwnerComments({ comments })).toHaveLength(1);
		expect(comment.length).toBe(1001);
		expect(comment.endsWith("…")).toBe(true);
	});

	it("코멘트가 많으면 최근 5개만 남긴다", () => {
		const comments = Array.from({ length: 8 }, (_, index) => commentOf("OWNER", `코멘트 ${index}`));

		expect(selectOwnerComments({ comments })).toEqual(["코멘트 3", "코멘트 4", "코멘트 5", "코멘트 6", "코멘트 7"]);
	});

	it("배열이 아니면 빈 목록이다", () => {
		expect(selectOwnerComments({ comments: null })).toEqual([]);
	});
});

describe("selectPreviousPulls", () => {
	it("접두사가 맞는 같은 저장소의 닫힌 PR 만 최근에 닫힌 순으로 고른다", () => {
		const pulls = [
			pullOf({ number: 1, closed_at: "2026-10-01T00:00:00Z", head: { ref: "claude/seo-fix-20261001", repo: { full_name: REPOSITORY } } }),
			pullOf({ number: 2, closed_at: "2026-10-03T00:00:00Z", head: { ref: "claude/seo-fix-20261003", repo: { full_name: REPOSITORY } } }),
			pullOf({ number: 3, head: { ref: "feat/claude/seo-fix-like", repo: { full_name: REPOSITORY } } }),
			pullOf({ number: 4, head: { ref: "claude/seo-fix-20261004", repo: { full_name: "attacker/Web-Memo" } } }),
			pullOf({ number: 5, head: { ref: "claude/seo-fix-20261005", repo: null } }),
			pullOf({ number: 6, state: "open", head: { ref: "claude/seo-fix-20261006", repo: { full_name: REPOSITORY } } }),
		];

		const selected = selectPreviousPulls({ pulls, repository: REPOSITORY, branchPrefix: "claude/seo-fix-" });

		expect(selected.map((pull) => pull.number)).toEqual([2, 1]);
	});

	it("branch 를 주면 정확히 같은 브랜치만 고른다", () => {
		const pulls = [
			pullOf({ number: 820 }),
			pullOf({ number: 821, head: { ref: "sentry-fix/78230519810", repo: { full_name: REPOSITORY } } }),
		];

		const selected = selectPreviousPulls({ pulls, repository: REPOSITORY, branch: "sentry-fix/7823051981" });

		expect(selected.map((pull) => pull.number)).toEqual([820]);
	});

	it("20건을 넘으면 최근 20건만 남긴다", () => {
		const pulls = Array.from({ length: 25 }, (_, index) =>
			pullOf({ number: index + 1, closed_at: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00Z` }),
		);

		const selected = selectPreviousPulls({ pulls, repository: REPOSITORY, branch: "sentry-fix/7823051981" });

		expect(selected).toHaveLength(MAX_PREVIOUS_PULL_REQUESTS);
		expect(selected[0].number).toBe(25);
		expect(selected.at(-1)?.number).toBe(6);
	});
});

describe("fetchPreviousPullRequests", () => {
	it("이전 PR 이 없으면 빈 목록이다", async () => {
		const fetchImpl = createFetch([["/repos/guesung/Web-Memo/pulls?", []]]);

		const result = await fetchPreviousPullRequests({ repository: REPOSITORY, token: "t", branch: "sentry-fix/1", fetchImpl });

		expect(result).toEqual([]);
	});

	it("브랜치로 조회하면 닫힌 PR 은 closed, 머지된 PR 은 merged 로 돌려준다", async () => {
		const calls: string[] = [];
		const fetchImpl = createFetch(
			[
				["/repos/guesung/Web-Memo/pulls?", [pullOf(), pullOf({ number: 811, merged_at: "2026-11-01T04:54:31Z", closed_at: "2026-11-01T04:54:31Z" })]],
				["/repos/guesung/Web-Memo/issues/820/comments", [commentOf("OWNER", "노이즈 필터는 Sentry 인바운드 필터로 처리합니다"), commentOf("NONE", "외부 코멘트")]],
				["/repos/guesung/Web-Memo/issues/811/comments", []],
			],
			calls,
		);

		const result = await fetchPreviousPullRequests({ repository: REPOSITORY, token: "t", branch: "sentry-fix/7823051981", fetchImpl });

		expect(result).toEqual([
			{
				number: 820,
				url: "https://github.com/guesung/Web-Memo/pull/820",
				branch: "sentry-fix/7823051981",
				state: "closed",
				title: "fix: Sentry WEB-MEMO-WEB-5K 오류 수정",
				body: "## 설명\n\n- 수정: 필터 추가\n- 가설: 확장 노이즈",
				closedAt: "2026-11-05T00:00:00Z",
				ownerComments: ["노이즈 필터는 Sentry 인바운드 필터로 처리합니다"],
			},
			expect.objectContaining({ number: 811, state: "merged", ownerComments: [] }),
		]);
		expect(calls[0]).toContain("state=closed");
		expect(calls[0]).toContain(`head=${encodeURIComponent("guesung:sentry-fix/7823051981")}`);
		expect(calls[0]).toContain("per_page=20");
	});

	it("접두사로 조회하면 검색으로 찾은 PR 을 하나씩 읽고 접두사가 다른 것은 버린다", async () => {
		const calls: string[] = [];
		const seoPull = (number: number, ref: string) => pullOf({ number, head: { ref, repo: { full_name: REPOSITORY } } });
		const fetchImpl = createFetch(
			[
				["/search/issues?", { items: [{ number: 702 }, { number: 900 }] }],
				["/repos/guesung/Web-Memo/pulls/702", seoPull(702, "claude/seo-fix-20261003")],
				["/repos/guesung/Web-Memo/pulls/900", seoPull(900, "feat/other")],
				["/repos/guesung/Web-Memo/issues/702/comments", []],
			],
			calls,
		);

		const result = await fetchPreviousPullRequests({ repository: REPOSITORY, token: "t", branchPrefix: "claude/seo-fix-", fetchImpl });

		expect(result.map((pull) => pull.number)).toEqual([702]);
		expect(decodeURIComponent(calls[0])).toContain("repo:guesung/Web-Memo is:pr is:closed head:claude/seo-fix-");
		expect(calls[0]).toContain("per_page=20");
		expect(calls).not.toContain("/repos/guesung/Web-Memo/issues/900/comments?per_page=100");
	});

	it("검색 결과가 20건을 넘어도 20건까지만 읽는다", async () => {
		const calls: string[] = [];
		const items = Array.from({ length: 25 }, (_, index) => ({ number: index + 1 }));
		const fetchImpl = vi.fn(async (url: string) => {
			const requestPath = url.replace("https://api.github.com", "");
			calls.push(requestPath);
			if (requestPath.startsWith("/search/issues?")) {
				return { ok: true, status: 200, json: async () => ({ items }) };
			}
			const number = Number(/\/(?:pulls|issues)\/(\d+)/.exec(requestPath)?.[1]);
			if (requestPath.includes("/comments")) {
				return { ok: true, status: 200, json: async () => [] };
			}

			return {
				ok: true,
				status: 200,
				json: async () => pullOf({ number, head: { ref: `chore/auto-ga-events-${number}`, repo: { full_name: REPOSITORY } } }),
			};
		});

		const result = await fetchPreviousPullRequests({ repository: REPOSITORY, token: "t", branchPrefix: "chore/auto-ga-events-", fetchImpl });

		expect(result).toHaveLength(20);
		expect(calls.filter((call) => /\/pulls\/\d+$/.test(call))).toHaveLength(20);
		expect(calls).not.toContain("/repos/guesung/Web-Memo/pulls/21");
	});

	it("본문이 길면 자른다", async () => {
		const fetchImpl = createFetch([
			["/repos/guesung/Web-Memo/pulls?", [pullOf({ body: "가".repeat(7000) })]],
			["/repos/guesung/Web-Memo/issues/820/comments", []],
		]);

		const [pull] = await fetchPreviousPullRequests({ repository: REPOSITORY, token: "t", branch: "sentry-fix/7823051981", fetchImpl });

		expect(pull.body.length).toBe(6001);
	});

	it("API 가 실패하면 토큰 없이 경로와 상태 코드만 담아 던진다", async () => {
		const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));

		await expect(
			fetchPreviousPullRequests({ repository: REPOSITORY, token: "secret-token", branch: "sentry-fix/1", fetchImpl }),
		).rejects.toThrow("GitHub API 실패: /repos/guesung/Web-Memo/pulls -> 503");
	});

	it.each([
		[{ repository: "", token: "t", branch: "a" }, "GITHUB_REPOSITORY"],
		[{ repository: REPOSITORY, token: "", branch: "a" }, "토큰"],
		[{ repository: REPOSITORY, token: "t" }, "하나만"],
		[{ repository: REPOSITORY, token: "t", branch: "a", branchPrefix: "b" }, "하나만"],
	])("입력이 올바르지 않으면 던진다 (%#)", async (options, message) => {
		await expect(fetchPreviousPullRequests(options)).rejects.toThrow(message);
	});
});

describe("loadPreviousPullRequests", () => {
	it("조회에 성공하면 목록을 그대로 돌려준다", async () => {
		const fetchImpl = createFetch([
			["/repos/guesung/Web-Memo/pulls?", [pullOf()]],
			["/repos/guesung/Web-Memo/issues/820/comments", []],
		]);

		const result = await loadPreviousPullRequests({ label: "Sentry AI 분석", repository: REPOSITORY, token: "t", branch: "sentry-fix/7823051981", fetchImpl });

		expect(result.failed).toBe(false);
		expect(result.pullRequests.map((pull) => pull.number)).toEqual([820]);
	});

	it("조회에 실패하면 던지지 않고 빈 목록과 함께 Step Summary 에 사실을 남긴다", async () => {
		const summaryFile = path.join(mkdtempSync(path.join(tmpdir(), "previous-prs-")), "summary.md");
		vi.stubEnv("GITHUB_STEP_SUMMARY", summaryFile);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const fetchImpl = vi.fn(async () => {
			throw new Error("network down");
		});

		const result = await loadPreviousPullRequests({ label: "SEO 자동 수정", repository: REPOSITORY, token: "t", branchPrefix: "claude/seo-fix-", fetchImpl });

		expect(result.pullRequests).toEqual([]);
		expect(result.failed).toBe(true);
		expect(result.message).toContain("SEO 자동 수정: 이전 자동 PR 기록을 조회하지 못해 이전 기록 없이 진행합니다");
		expect(readFileSync(summaryFile, "utf8")).toContain("network down");
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("::warning::SEO 자동 수정"));
	});

	it("토큰이 없어도 던지지 않는다", async () => {
		vi.stubEnv("GITHUB_STEP_SUMMARY", "");
		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		const result = await loadPreviousPullRequests({ label: "GA 이벤트 점검", repository: REPOSITORY, token: undefined, branchPrefix: "chore/auto-ga-events-" });

		expect(result).toEqual(expect.objectContaining({ pullRequests: [], failed: true }));
	});
});
