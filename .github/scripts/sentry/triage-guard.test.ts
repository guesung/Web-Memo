import { describe, expect, it } from "vitest";
import {
	decideGuard,
	parseDailyLimit,
	readIssueIdFromRunName,
} from "./triage-guard.mjs";
import { validateInputs } from "./triage-inputs.mjs";

const base = {
	issueId: "111",
	openPrUrl: null,
	runsToday: [],
	currentRunId: 1,
	dailyLimit: 3,
};

describe("validateInputs", () => {
	const valid = {
		issueId: "123",
		shortId: "WEB-MEMO-4E",
		projectSlug: "web-memo-web",
		action: "created",
		slackChannel: "C012AB3CD",
		slackTs: "1700000000.000100",
	};

	it("올바른 입력을 통과시킨다", () => {
		expect(validateInputs(valid).ok).toBe(true);
	});

	it.each([
		["issueId", "12a"],
		["issueId", "1; rm -rf /"],
		["projectSlug", "other"],
		["action", "resolved"],
		["slackChannel", "C1 $(x)"],
	])("%s=%s 는 거부한다", (key, value) => {
		expect(validateInputs({ ...valid, [key]: value }).ok).toBe(false);
	});

	it("slack_ts 가 비었거나 형식이 틀리면 실패 대신 비운다", () => {
		for (const slackTs of ["", "abc"]) {
			const result = validateInputs({ ...valid, slackTs });
			expect(result.ok && result.value.slackTs).toBe("");
		}
	});
});

describe("decideGuard", () => {
	it("열린 수정 PR 이 있으면 건너뛰고 URL 을 낸다", () => {
		const result = decideGuard({ ...base, openPrUrl: "https://x/pull/1" });
		expect(result).toMatchObject({ proceed: false, existingPrUrl: "https://x/pull/1" });
	});

	it("같은 이슈가 오늘 성공했으면 건너뛴다", () => {
		const runsToday = [
			{ id: 2, conclusion: "success", display_title: "Sentry triage A [issue:111]" },
		];
		expect(decideGuard({ ...base, runsToday }).proceed).toBe(false);
	});

	it("다른 이슈의 성공이나 같은 이슈의 실패는 막지 않는다", () => {
		const runsToday = [
			{ id: 2, conclusion: "success", display_title: "Sentry triage A [issue:222]" },
			{ id: 3, conclusion: "failure", display_title: "Sentry triage A [issue:111]" },
		];
		expect(decideGuard({ ...base, runsToday }).proceed).toBe(true);
	});

	it("현재 실행을 빼고 센 수가 상한 이상이면 건너뛴다", () => {
		const runs = (n: number) =>
			Array.from({ length: n }, (_, index) => ({
				id: index + 1,
				conclusion: "failure",
				display_title: `t [issue:${index + 900}]`,
			}));
		expect(decideGuard({ ...base, runsToday: runs(3) }).proceed).toBe(true);
		expect(decideGuard({ ...base, runsToday: runs(4) }).proceed).toBe(false);
	});
});

describe("parseDailyLimit", () => {
	it("비었거나 숫자가 아니면 기본 3", () => {
		expect(parseDailyLimit("")).toBe(3);
		expect(parseDailyLimit(undefined)).toBe(3);
		expect(parseDailyLimit("abc")).toBe(3);
		expect(parseDailyLimit("5")).toBe(5);
		expect(parseDailyLimit("0")).toBe(0);
	});
});

describe("readIssueIdFromRunName", () => {
	it("끝의 마커만 읽는다", () => {
		expect(readIssueIdFromRunName("Sentry triage [issue:9] x [issue:123]")).toBe("123");
		expect(readIssueIdFromRunName("Sentry triage")).toBeNull();
	});
});
