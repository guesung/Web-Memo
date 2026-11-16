// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { describe, expect, it } from "vitest";

import {
	buildGaInsightPayload,
	normalizeGaInsight,
} from "./ga-insight-report.mjs";

const item = (overrides = {}) => ({
	title: "메모 작성 건수 급증은 한 기기로 추정",
	detail: "`memo_write` 220건 중 180건이 23시 한 해상도에서 나왔습니다(표본 4명).",
	action: "같은 패턴이 3일 이어지면 자동저장 주기를 점검합니다.",
	...overrides,
});

const dailyRaw = (overrides = {}) =>
	JSON.stringify({
		summary: "활성은 평소 수준이고 건수만 튀었습니다.",
		insights: [item(), item({ title: "설치는 평균 이하" })],
		caveats: ["사람 수가 한 자릿수라 한두 명에 좌우됩니다."],
		...overrides,
	});

const weeklyRaw = (overrides = {}) =>
	JSON.stringify({
		summary: "WAU 는 3주째 완만히 늘었습니다.",
		trend: [item({ title: "WAU 3주 연속 증가", action: "" })],
		impact: [item({ title: "하이라이트 메모 도입" })],
		improvements: [item({ title: "가입 → 메모 작성 구간 이탈" })],
		removalCandidates: [],
		caveats: [],
		...overrides,
	});

const blockTexts = (payload) =>
	payload.blocks.map(
		(block) => block.text?.text ?? block.elements?.[0]?.text ?? "",
	);

describe("normalizeGaInsight — 일일", () => {
	it("형태가 맞는 인사이트와 단서를 남긴다", () => {
		const insight = normalizeGaInsight({ raw: dailyRaw(), kind: "daily" });

		expect(insight.kind).toBe("daily");
		expect(insight.insights).toHaveLength(2);
		expect(insight.insights[0]).toEqual(item());
		expect(insight.caveats).toEqual([
			"사람 수가 한 자릿수라 한두 명에 좌우됩니다.",
		]);
	});

	it("제목이나 본문이 빈 항목은 버리고 5개를 넘으면 앞의 5개만 쓴다", () => {
		const insights = [
			item({ title: "" }),
			item({ detail: "   " }),
			...Array.from({ length: 7 }, (_, index) => item({ title: `인사이트 ${index + 1}` })),
		];
		const insight = normalizeGaInsight({
			raw: dailyRaw({ insights }),
			kind: "daily",
		});

		expect(insight.insights.map(({ title }) => title)).toEqual([
			"인사이트 1",
			"인사이트 2",
			"인사이트 3",
			"인사이트 4",
			"인사이트 5",
		]);
	});

	it("채널 호출·사용자 멘션 문법을 지운다", () => {
		const insight = normalizeGaInsight({
			raw: dailyRaw({
				summary: "<!channel> 확인 필요 <@U0BRTBRAX8T>",
				insights: [item({ detail: "<!here> 급증 <!subteam^S123|팀>" })],
			}),
			kind: "daily",
		});

		expect(insight.summary).toBe("확인 필요");
		expect(insight.insights[0].detail).toBe("급증");
	});

	it("너무 긴 글은 잘라 Slack 블록 한도를 넘지 않게 한다", () => {
		const insight = normalizeGaInsight({
			raw: dailyRaw({ insights: [item({ detail: "가".repeat(5000) })] }),
			kind: "daily",
		});

		expect(insight.insights[0].detail).toHaveLength(1200);
		expect(insight.insights[0].detail.endsWith("…")).toBe(true);
	});

	it.each([
		["남는 인사이트가 없을 때", dailyRaw({ insights: [] }), "보낼 수 있는 인사이트가 없습니다"],
		["객체가 아닐 때", "[]", "객체가 아닙니다"],
		["JSON 이 아닐 때", "not json", "JSON"],
	])("%s 던진다", (_, raw, message) => {
		expect(() => normalizeGaInsight({ raw, kind: "daily" })).toThrow(message);
	});

	it("자격 증명처럼 보이는 문자열이 섞이면 통째로 버린다", () => {
		const raw = dailyRaw({
			insights: [item({ detail: "-----BEGIN PRIVATE KEY-----\\nMIIE" })],
		});

		expect(() => normalizeGaInsight({ raw, kind: "daily" })).toThrow(
			"자격 증명",
		);
	});
});

describe("normalizeGaInsight — 주간", () => {
	it("네 부분 가운데 항목이 있는 것만 순서대로 남긴다", () => {
		const insight = normalizeGaInsight({ raw: weeklyRaw(), kind: "weekly" });

		expect(insight.sections.map(({ heading }) => heading)).toEqual([
			"① 추이",
			"② 가장 임팩트가 컸던 것",
			"③ 보완해야 할 것",
		]);
		// 추이 항목은 행동 제안이 없어도 됩니다.
		expect(insight.sections[0].items[0].action).toBe("");
	});

	it("제거 후보가 있으면 네 번째 부분으로 붙는다", () => {
		const insight = normalizeGaInsight({
			raw: weeklyRaw({
				removalCandidates: [item({ title: "카테고리 추천 4주째 0명" })],
			}),
			kind: "weekly",
		});

		expect(insight.sections.at(-1)).toMatchObject({
			heading: "④ 제거(정리)를 검토해도 될 기능",
			items: [{ title: "카테고리 추천 4주째 0명" }],
		});
	});

	it("모든 부분이 비면 던진다", () => {
		const raw = weeklyRaw({ trend: [], impact: [], improvements: [] });

		expect(() => normalizeGaInsight({ raw, kind: "weekly" })).toThrow(
			"보낼 수 있는 인사이트가 없습니다",
		);
	});
});

describe("buildGaInsightPayload", () => {
	const RUN_URL = "https://github.com/guesung/Web-Memo/actions/runs/1";

	it("일일은 제목·요약, 번호 매긴 인사이트와 제안, 단서, AI 생성 표시 순서로 만든다", () => {
		const payload = buildGaInsightPayload({
			insight: normalizeGaInsight({ raw: dailyRaw(), kind: "daily" }),
			context: { kind: "daily", targetDate: "2026-11-15" },
			runUrl: RUN_URL,
		});
		const texts = blockTexts(payload);

		expect(payload.text).toBe("AI 인사이트 — 11/15 어제의 특이점");
		expect(texts[0]).toBe(
			"*AI 인사이트 — 11/15 어제의 특이점*\n활성은 평소 수준이고 건수만 튀었습니다.",
		);
		expect(texts[1]).toBe(
			[
				"*1. 메모 작성 건수 급증은 한 기기로 추정*",
				"`memo_write` 220건 중 180건이 23시 한 해상도에서 나왔습니다(표본 4명).",
				"→ *제안:* 같은 패턴이 3일 이어지면 자동저장 주기를 점검합니다.",
			].join("\n"),
		);
		expect(texts[2].startsWith("*2. 설치는 평균 이하*")).toBe(true);
		expect(texts[3]).toBe("단서: 사람 수가 한 자릿수라 한두 명에 좌우됩니다.");
		expect(texts.at(-1)).toBe(`AI 생성 · <${RUN_URL}|워크플로 런>`);
	});

	it("주간은 부분 제목 아래에 부분마다 1번부터 번호를 매긴다", () => {
		const payload = buildGaInsightPayload({
			insight: normalizeGaInsight({ raw: weeklyRaw(), kind: "weekly" }),
			context: {
				kind: "weekly",
				week: { start: "2026-11-07", end: "2026-11-13" },
			},
			runUrl: RUN_URL,
		});
		const texts = blockTexts(payload);

		expect(payload.text).toBe("AI 인사이트 — 11/7~11/13 주간");
		expect(texts.slice(1, 7)).toEqual([
			"*① 추이*",
			expect.stringMatching(/^\*1\. WAU 3주 연속 증가\*\n/),
			"*② 가장 임팩트가 컸던 것*",
			expect.stringMatching(/^\*1\. 하이라이트 메모 도입\*\n/),
			"*③ 보완해야 할 것*",
			expect.stringMatching(/^\*1\. 가입 → 메모 작성 구간 이탈\*\n/),
		]);
		// 행동 제안이 없는 추이 항목에는 제안 줄이 없습니다.
		expect(texts[2]).not.toContain("제안");
	});

	it("단서가 없으면 단서 블록을 빼고, 런 링크가 없으면 표시만 남긴다", () => {
		const payload = buildGaInsightPayload({
			insight: normalizeGaInsight({
				raw: dailyRaw({ caveats: [] }),
				kind: "daily",
			}),
			context: { kind: "daily", targetDate: "2026-11-15" },
			runUrl: null,
		});
		const texts = blockTexts(payload);

		expect(texts.some((text) => text.startsWith("단서:"))).toBe(false);
		expect(texts.at(-1)).toBe("AI 생성");
	});

	it("모든 section 블록이 Slack 한도(3000자) 안이다", () => {
		const long = item({
			title: "가".repeat(400),
			detail: "나".repeat(5000),
			action: "다".repeat(2000),
		});
		const payload = buildGaInsightPayload({
			insight: normalizeGaInsight({
				raw: dailyRaw({ insights: [long, long, long, long, long] }),
				kind: "daily",
			}),
			context: { kind: "daily", targetDate: "2026-11-15" },
			runUrl: RUN_URL,
		});

		for (const text of blockTexts(payload)) {
			expect(text.length).toBeLessThanOrEqual(3000);
		}
		expect(payload.blocks.length).toBeLessThanOrEqual(50);
	});
});
