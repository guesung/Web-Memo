import { ANALYTICS_EXCLUDED_USER_ID } from "@web-memo/shared/constants";
import { describe, expect, it } from "vitest";
import {
	buildEventParams,
	buildPayload,
	isSessionExpired,
	isTrackableUser,
	shouldSendEvent,
} from "./analyticsCore";

const MINUTE = 60000;

describe("isSessionExpired", () => {
	it("이벤트가 없었으면 만료로 본다", () => {
		expect(isSessionExpired({ lastEventAt: null, now: 1 })).toBe(true);
	});

	it("30분 이내면 유지한다", () => {
		expect(isSessionExpired({ lastEventAt: 0, now: 30 * MINUTE })).toBe(false);
	});

	it("30분을 넘기면 만료한다", () => {
		expect(isSessionExpired({ lastEventAt: 0, now: 30 * MINUTE + 1 })).toBe(
			true,
		);
	});
});

describe("게이트", () => {
	it("개발 빌드는 전송하지 않는다", () => {
		expect(shouldSendEvent(true)).toBe(false);
		expect(shouldSendEvent(false)).toBe(true);
	});

	it("제외 대상 user_id는 전송하지 않는다", () => {
		expect(isTrackableUser(ANALYTICS_EXCLUDED_USER_ID)).toBe(false);
		expect(isTrackableUser("other")).toBe(true);
		expect(isTrackableUser(undefined)).toBe(true);
	});
});

describe("buildEventParams", () => {
	it("page_view에 공통 파라미터를 얹는다", () => {
		const params = buildEventParams({
			event: {
				name: "page_view",
				params: { page_title: "/a", page_location: "webmemo://app/a" },
			},
			environment: {
				isDevelopment: false,
				appVersion: "1.2.3",
				platform: "ios",
			},
		});

		expect(params).toEqual({
			page_title: "/a",
			page_location: "webmemo://app/a",
			event_category: "engagement",
			engagement_time_msec: 100,
			build_env: "production",
			app_version: "1.2.3",
			app_platform: "ios",
		});
	});
});

describe("buildPayload", () => {
	it("user_id가 있을 때만 싣고 session_id를 params에 넣는다", () => {
		const base = {
			clientId: "c",
			sessionId: "s",
			eventName: "page_view",
			params: { a: 1 },
		};

		expect(buildPayload({ ...base, userId: "u" })).toEqual({
			client_id: "c",
			user_id: "u",
			events: [{ name: "page_view", params: { session_id: "s", a: 1 } }],
		});
		expect(buildPayload({ ...base, userId: undefined })).not.toHaveProperty(
			"user_id",
		);
	});
});
