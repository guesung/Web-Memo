import { describe, expect, it } from "vitest";

import type { IFSentryEventResponse } from "./api";
import { extractEventContext, sanitizeForSlack } from "./eventContext";

const now = new Date("2026-10-29T00:00:00.000Z");

const buildEvent = (
	override: Partial<IFSentryEventResponse> = {},
): IFSentryEventResponse => ({
	eventID: "0123456789abcdef0123456789abcdef",
	tags: [
		{ key: "environment", value: "production" },
		{ key: "runtime", value: "mobile-app" },
	],
	release: { version: "1.2.3" },
	contexts: {
		browser: { name: "Chrome", version: "130" },
		os: { name: "macOS", version: "15" },
	},
	entries: [],
	...override,
});

describe("sanitizeForSlack", () => {
	it("URL의 query와 fragment를 제거한다", () => {
		expect(sanitizeForSlack("GET https://a.com/p?token=1#x 실패")).toBe(
			"GET https://a.com/p 실패",
		);
	});

	it("이메일·Bearer·토큰 패턴을 마스킹한다", () => {
		const text = sanitizeForSlack(
			"a@b.com Bearer abc.def xoxb-123-abc ghp_abcDEF123 sk-abcdefgh1234 " +
				"0123456789abcdef0123456789abcdef",
		);

		expect(text).not.toMatch(
			/a@b\.com|abc\.def|xoxb|ghp_|sk-abc|0123456789abcdef/,
		);
		expect(text).toContain("[masked]");
	});

	it("mrkdwn 특수문자를 이스케이프하고 백틱을 치환한다", () => {
		expect(sanitizeForSlack("<!channel> & `x`")).toBe(
			"&lt;!channel&gt; &amp; 'x'",
		);
	});

	it("길이를 제한한다", () => {
		expect(sanitizeForSlack("가".repeat(500)).length).toBeLessThanOrEqual(201);
	});
});

describe("extractEventContext", () => {
	it("태그·브라우저·OS·릴리스를 뽑고 eventId는 마스킹하지 않는다", () => {
		const context = extractEventContext({ event: buildEvent(), now });

		expect(context).toMatchObject({
			eventId: "0123456789abcdef0123456789abcdef",
			environment: "production",
			release: "1.2.3",
			browser: "Chrome 130",
			os: "macOS 15",
			runtime: "mobile-app",
			fetchedAt: "2026-10-29T00:00:00.000Z",
		});
	});

	it("runtime 태그가 없으면 project slug로 추정한다", () => {
		const event = buildEvent({ tags: [] });

		expect(
			extractEventContext({ event, projectSlug: "web-memo", now }).runtime,
		).toBe("extension");
		expect(
			extractEventContext({ event, projectSlug: "web-memo-web", now }).runtime,
		).toBe("web");
		expect(
			extractEventContext({ event, projectSlug: "other", now }).runtime,
		).toBeNull();
	});

	it("없는 값은 null로 둔다(추정하지 않는다)", () => {
		const context = extractEventContext({ event: {}, now });

		expect(context.environment).toBeNull();
		expect(context.release).toBeNull();
		expect(context.frames).toEqual([]);
		expect(context.breadcrumbs).toEqual([]);
	});

	it("in-app 프레임을 최신 순으로 최대 5개 고른다", () => {
		const frames = Array.from({ length: 8 }, (_, index) => ({
			filename: `app/${index}.ts`,
			lineNo: index,
			colNo: 1,
			function: `fn${index}`,
			inApp: true,
		}));
		const event = buildEvent({
			entries: [
				{
					type: "exception",
					data: {
						values: [
							{
								type: "TypeError",
								value: "boom",
								stacktrace: {
									frames: [{ filename: "lib.js", inApp: false }, ...frames],
								},
							},
						],
					},
				},
			],
		});
		const context = extractEventContext({ event, now });

		expect(context.exception).toBe("TypeError: boom");
		expect(context.frames).toHaveLength(5);
		expect(context.frames[0]).toBe("app/7.ts:7:1 fn7");
		expect(context.frames.join()).not.toContain("lib.js");
	});

	it("in-app 프레임이 없으면 전체의 뒤쪽을 쓴다", () => {
		const event = buildEvent({
			entries: [
				{
					type: "exception",
					data: {
						values: [
							{ stacktrace: { frames: [{ filename: "a.js", lineNo: 1 }] } },
						],
					},
				},
			],
		});

		expect(extractEventContext({ event, now }).frames).toEqual(["a.js:1"]);
	});

	it("breadcrumb은 최근 5개만, category level message로 정제해 뽑는다", () => {
		const values = Array.from({ length: 7 }, (_, index) => ({
			category: "ui",
			level: "info",
			message: `click ${index} https://a.com/x?secret=1`,
		}));
		const context = extractEventContext({
			event: buildEvent({
				entries: [{ type: "breadcrumbs", data: { values } }],
			}),
			now,
		});

		expect(context.breadcrumbs).toHaveLength(5);
		expect(context.breadcrumbs[4]).toBe("ui info click 6 https://a.com/x");
	});
});
