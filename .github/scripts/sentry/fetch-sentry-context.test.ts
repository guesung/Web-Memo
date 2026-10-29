import { describe, expect, it } from "vitest";
import {
	buildContext,
	extractBreadcrumbs,
	extractFrames,
	sanitizeString,
} from "./fetch-sentry-context.mjs";

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
