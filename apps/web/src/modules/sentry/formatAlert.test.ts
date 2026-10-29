import { describe, expect, it } from "vitest";

import type { IFSentryEventContext } from "./eventContext";
import { formatSentryAlertText, SLACK_TEXT_LIMIT } from "./formatAlert";
import type { IFSentryIssueWebhookPayload } from "./request";

const buildPayload = (
	action = "created",
	issue: NonNullable<IFSentryIssueWebhookPayload["data"]>["issue"] = {},
): IFSentryIssueWebhookPayload => ({
	action,
	data: {
		issue: {
			id: "123",
			shortId: "WEB-1",
			title: "TypeError: boom",
			culprit: "app/a.ts",
			permalink: "https://sentry.io/issues/123/",
			level: "error",
			count: "42",
			userCount: 7,
			firstSeen: "2026-10-28T15:00:00Z",
			lastSeen: "2026-10-28T16:30:00Z",
			project: { slug: "web-memo-web" },
			tags: [["feature", "memo"]],
			...issue,
		},
	},
});

const context: IFSentryEventContext = {
	eventId: "0123456789abcdef0123456789abcdef",
	fetchedAt: "2026-10-29T00:00:00.000Z",
	environment: "production",
	release: "1.2.3",
	browser: "Chrome 130",
	os: "macOS 15",
	runtime: "web",
	exception: "TypeError: boom",
	frames: ["app/a.ts:1:2 fn"],
	breadcrumbs: ["ui info click"],
};

describe("formatSentryAlertText", () => {
	it("신규와 재발을 구분해 표기한다", () => {
		expect(formatSentryAlertText(buildPayload("created"))).toContain("🆕 신규");
		expect(formatSentryAlertText(buildPayload("unresolved"))).toContain(
			"🔁 재발",
		);
	});

	it("이벤트 컨텍스트가 있으면 모든 항목을 싣는다", () => {
		const text = formatSentryAlertText(buildPayload(), context);

		expect(text).toContain("feature=memo");
		expect(text).toContain("environment production · release 1.2.3");
		expect(text).toContain("브라우저 Chrome 130 · OS macOS 15");
		expect(text).toContain("발생 42회 · 영향 사용자 7명 (웹훅 수신 시점 값)");
		expect(text).toContain("조회 2026-10-29 09:00 KST");
		expect(text).toContain("0123456789abcdef0123456789abcdef");
		expect(text).toContain("알림 유발 이벤트와 다를 수 있음");
		expect(text).toContain("• app/a.ts:1:2 fn");
		expect(text).toContain("• ui info click");
		expect(text.endsWith("https://sentry.io/issues/123/")).toBe(true);
	});

	it("시각을 KST로 변환한다", () => {
		const text = formatSentryAlertText(buildPayload());

		expect(text).toContain("2026-10-29 00:00 KST ~ 2026-10-29 01:30 KST");
	});

	it("이벤트가 없어도 웹훅 필드만으로 나가고 이벤트 줄은 생략한다", () => {
		const text = formatSentryAlertText(buildPayload(), null);

		expect(text).toContain("TypeError: boom");
		expect(text).not.toContain("대표 이벤트");
		expect(text).not.toContain("environment");
	});

	it("미수집 값을 0이나 production으로 추정하지 않는다", () => {
		const text = formatSentryAlertText(
			buildPayload("created", {
				count: undefined,
				userCount: undefined,
				level: undefined,
				firstSeen: undefined,
				lastSeen: undefined,
			}),
			{ ...context, environment: null, release: null, eventId: null },
		);

		expect(text).toContain("발생 미수집회 · 영향 사용자 미수집명");
		expect(text).toContain("level 미수집");
		expect(text).toContain("environment 미수집 · release 미수집");
		expect(text).not.toContain("production");
		expect(text).not.toContain("관측 기간");
	});

	it("길이 상한 안에서 자르되 링크는 남긴다", () => {
		const text = formatSentryAlertText(buildPayload(), {
			...context,
			breadcrumbs: Array.from({ length: 100 }, () => "x".repeat(200)),
		});

		expect(text.length).toBeLessThanOrEqual(SLACK_TEXT_LIMIT);
		expect(text.endsWith("https://sentry.io/issues/123/")).toBe(true);
	});
});
