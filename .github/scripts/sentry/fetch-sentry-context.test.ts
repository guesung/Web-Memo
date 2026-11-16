import { describe, expect, it } from "vitest";
import {
	buildContext,
	extractBreadcrumbs,
	extractFrames,
	parsePreviousAttempts,
	sanitizeString,
} from "./fetch-sentry-context.mjs";

describe("previousAttempts", () => {
	const inputs = { issueId: "1", shortId: "S", projectSlug: "web-memo", action: "unresolved" };
	const build = (previousAttempts?: unknown) =>
		buildContext({ inputs, issue: null, event: null, fetchedAt: "x", notes: [], previousAttempts } as any);
	const merged = {
		number: 820,
		state: "merged",
		closedAt: "2026-01-02T00:00:00Z",
		fixSummary: "null 가드 추가",
		hypothesis: "삭제된 메모",
		ownerComments: [],
	};

	it("이전 PR 이 없으면 빈 배열이고 나머지 context 는 그대로다", () => {
		const withDefault = build();
		expect(withDefault.previousAttempts).toEqual([]);
		expect(parsePreviousAttempts("")).toEqual({ attempts: [], note: "" });
		expect(parsePreviousAttempts(undefined)).toEqual({ attempts: [], note: "" });
		expect(parsePreviousAttempts("[]")).toEqual({ attempts: [], note: "" });
		const { previousAttempts: _ignored, ...rest } = withDefault;
		expect(Object.keys(rest)).toEqual([
			"untrusted",
			"notice",
			"fetchedAt",
			"webhook",
			"degraded",
			"notes",
			"issue",
			"event",
		]);
	});

	it("notice 가 이전 PR 기록도 비신뢰 데이터로 밝힌다", () => {
		expect(build().notice).toMatch(/Sentry/);
		expect(build().notice).toMatch(/이전 자동 PR/);
	});

	it("머지된 시도를 pullRequest 필드로 담는다", () => {
		const { attempts } = parsePreviousAttempts(JSON.stringify([merged]));
		expect(attempts).toEqual([
			{
				pullRequest: 820,
				state: "merged",
				closedAt: "2026-01-02T00:00:00Z",
				fixSummary: "null 가드 추가",
				hypothesis: "삭제된 메모",
				ownerComments: [],
			},
		]);
		expect(build(attempts).previousAttempts).toEqual(attempts);
	});

	it("닫힘+코멘트, 닫힘+코멘트 없음을 구분해 담는다", () => {
		const { attempts } = parsePreviousAttempts(
			JSON.stringify([
				{ ...merged, number: 1, state: "closed", ownerComments: ["원인이 달라요"] },
				{ ...merged, number: 2, state: "closed", ownerComments: [] },
			]),
		);
		expect(attempts.map((a: any) => [a.pullRequest, a.state, a.ownerComments.length])).toEqual([
			[1, "closed", 1],
			[2, "closed", 0],
		]);
	});

	it("긴 문자열은 자르고 이메일·토큰은 마스킹한다", () => {
		const { attempts } = parsePreviousAttempts(
			JSON.stringify([
				{
					...merged,
					fixSummary: "가".repeat(2000),
					ownerComments: ["문의 a@b.com ghp_abcdefghijklmnopqrstuvwxyz0123 " + "나".repeat(3000)],
				},
			]),
		);
		expect(attempts[0].fixSummary.length).toBe(601);
		const comment = attempts[0].ownerComments[0];
		expect(comment).not.toMatch(/a@b\.com|ghp_/);
		expect(comment.length).toBeLessThanOrEqual(1001);
	});

	it("허용 필드만 남기고 잘못된 원소는 버린다", () => {
		const { attempts } = parsePreviousAttempts(
			JSON.stringify([
				{ ...merged, token: "secret-value", extra: { a: 1 } },
				{ ...merged, number: "820" },
				{ ...merged, number: 1.5 },
				{ ...merged, state: "open" },
				null,
				"문자열",
			]),
		);
		expect(attempts).toHaveLength(1);
		expect(JSON.stringify(attempts)).not.toMatch(/secret-value|extra/);
	});

	it("20건까지만 담는다", () => {
		const many = Array.from({ length: 30 }, (_, index) => ({ ...merged, number: index + 1 }));
		expect(parsePreviousAttempts(JSON.stringify(many)).attempts).toHaveLength(20);
	});

	it("깨진 JSON 이나 배열이 아닌 값은 던지지 않고 빈 배열과 note 를 돌려준다", () => {
		for (const raw of ["{not json", '{"a":1}', "null", "123"]) {
			const result = parsePreviousAttempts(raw);
			expect(result.attempts).toEqual([]);
			expect(result.note).not.toBe("");
		}
	});
});

describe("sanitizeString", () => {
	it("URL 의 query·fragment 를 지운다", () => {
		expect(sanitizeString("GET https://a.com/p?token=abc#x failed")).toBe(
			"GET https://a.com/p failed",
		);
	});

	it("이메일과 토큰류를 마스킹한다", () => {
		const text = sanitizeString(
			"a@b.com xoxb-123-abc ghp_abcdefghijklmnopqrstuvwxyz0123 sk-abcdefghijklmnopqrst Bearer abc.def.ghi",
		);
		expect(text).not.toMatch(/a@b\.com|xoxb-|ghp_|sk-abc|abc\.def/);
	});

	it("긴 hex 와 github_pat 를 마스킹하되 긴 파일 경로는 남긴다", () => {
		expect(sanitizeString(`${"a1".repeat(20)} github_pat_${"A".repeat(30)}`)).toBe(
			"[redacted] [redacted]",
		);
		const path = "apps/web/src/modules/memo/components/detail/MemoDetailPanel.tsx";
		expect(sanitizeString(path)).toBe(path);
	});

	it("길이를 제한한다", () => {
		expect(sanitizeString("가".repeat(1000), 50).length).toBe(51);
	});
});

describe("이벤트 추출", () => {
	const event = {
		user: { email: "secret@x.com" },
		request: { headers: [["Cookie", "a=b"]] },
		extra: { token: "t" },
		entries: [
			{
				type: "exception",
				data: {
					values: [
						{
							stacktrace: {
								frames: [
									{ filename: "a.ts", inApp: true, lineNo: 1 },
									{ filename: "node_modules/x.js", inApp: false, lineNo: 2 },
									...Array.from({ length: 12 }, (_, i) => ({
										filename: `f${i}.ts`,
										inApp: true,
										lineNo: i,
									})),
								],
							},
						},
					],
				},
			},
			{
				type: "breadcrumbs",
				data: {
					values: Array.from({ length: 15 }, (_, i) => ({ category: "c", message: `m${i}` })),
				},
			},
		],
	};
	const inputs = { issueId: "1", shortId: "S", projectSlug: "web-memo", action: "created" };

	it("in-app 프레임을 최근 순으로 10개까지 고른다", () => {
		const frames = extractFrames(event);
		expect(frames).toHaveLength(10);
		expect(frames[0].file).toBe("f11.ts");
		expect(frames.every((frame) => !frame.file.includes("node_modules"))).toBe(true);
	});

	it("breadcrumb 은 마지막 10개", () => {
		const crumbs = extractBreadcrumbs(event);
		expect(crumbs).toHaveLength(10);
		expect(crumbs[9].message).toBe("m14");
	});

	it("user·request·extra 는 결과에 없다", () => {
		const context = buildContext({
			inputs,
			issue: { title: "t" },
			event,
			fetchedAt: "2026-01-01T00:00:00Z",
			notes: [],
		});
		expect(JSON.stringify(context)).not.toMatch(/secret@x\.com|Cookie|"token"/);
		expect(context.untrusted).toBe(true);
	});

	it("조회 실패 시 degraded 로 표시한다", () => {
		const context = buildContext({ inputs, issue: null, event: null, fetchedAt: "x", notes: ["n"] });
		expect(context.degraded).toBe(true);
	});
});
