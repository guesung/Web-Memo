// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EXCLUDED_USER_ID } from "../../constants";
import type { TAnalyticsEvent } from "./type";

/**
 * 빌드 환경과 실행 위치를 바꿔가며 analytics 싱글턴을 새로 만든다.
 * @description Analytics는 모듈 로드 시점에 인스턴스를 만드는 싱글턴이라,
 * 환경을 바꾸려면 모듈 자체를 다시 읽어야 한다.
 */
async function loadAnalytics({
	buildEnv,
	isExtension,
}: {
	buildEnv: string;
	isExtension: boolean;
}) {
	vi.resetModules();

	vi.doMock("@web-memo/env", () => ({
		CONFIG: { buildEnv, webUrl: "http://localhost:3000" },
	}));
	vi.doMock("../../utils", () => ({ isExtension: () => isExtension }));

	const { analytics } = await import("./Analytics");

	return analytics;
}

const EVENT: TAnalyticsEvent = { name: "side_panel_open" };

/** chrome.storage를 스텁합니다. 넘긴 것만 갈아끼우고 나머지는 기본 동작을 씁니다. */
function stubChromeStorage({
	get = vi.fn().mockResolvedValue({ clientId: "c" }),
	set = vi.fn(),
	remove = vi.fn(),
}: {
	get?: ReturnType<typeof vi.fn>;
	set?: ReturnType<typeof vi.fn>;
	remove?: ReturnType<typeof vi.fn>;
} = {}) {
	vi.stubGlobal("chrome", {
		storage: {
			local: { get, set, remove },
			session: {
				get: vi.fn().mockResolvedValue({ sessionData: null }),
				set: vi.fn(),
			},
		},
	});
}

describe("Analytics 환경별 동작", () => {
	let gtag: ReturnType<typeof vi.fn>;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		gtag = vi.fn();
		fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });

		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(console, "info").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		Reflect.deleteProperty(window, "gtag");
	});

	it("development에서는 전송하지 않고 콘솔에만 남긴다", async () => {
		window.gtag = gtag;
		const analytics = await loadAnalytics({
			buildEnv: "development",
			isExtension: false,
		});

		await analytics.trackEvent(EVENT);

		expect(gtag).not.toHaveBeenCalled();
		expect(console.info).toHaveBeenCalledWith(
			"[analytics] side_panel_open",
			expect.objectContaining({ build_env: "development" }),
		);
	});

	it("staging에서는 전송하면서 콘솔에도 남기고 debug_mode를 붙인다", async () => {
		window.gtag = gtag;
		const analytics = await loadAnalytics({
			buildEnv: "staging",
			isExtension: false,
		});

		await analytics.trackEvent(EVENT);

		expect(console.info).toHaveBeenCalled();
		expect(gtag).toHaveBeenCalledWith(
			"event",
			"side_panel_open",
			expect.objectContaining({ build_env: "staging", debug_mode: true }),
		);
	});

	it("production에서는 전송만 하고 콘솔에는 남기지 않으며 debug_mode도 없다", async () => {
		window.gtag = gtag;
		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});

		await analytics.trackEvent(EVENT);

		expect(console.info).not.toHaveBeenCalled();

		const [, , parameters] = gtag.mock.calls[0];
		expect(parameters.build_env).toBe("production");
		expect(parameters.debug_mode).toBeUndefined();
	});

	it("이벤트별 파라미터와 분류를 함께 싣는다", async () => {
		window.gtag = gtag;
		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});

		await analytics.trackEvent({
			name: "memo_delete",
			params: { memo_count: 3 },
		});

		expect(gtag).toHaveBeenCalledWith(
			"event",
			"memo_delete",
			expect.objectContaining({
				memo_count: 3,
				event_category: "core_action",
			}),
		);
	});

	it("웹에서 gtag가 없으면 조용히 넘어가지 않고 경고한다", async () => {
		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});

		await analytics.trackEvent(EVENT);

		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("gtag"));
	});

	it("확장에서 전송이 실패하면 응답 상태를 경고로 남긴다", async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 400 });
		vi.stubGlobal("chrome", {
			storage: {
				local: {
					get: vi.fn().mockResolvedValue({ clientId: "c" }),
					set: vi.fn(),
				},
				session: {
					get: vi.fn().mockResolvedValue({ sessionData: null }),
					set: vi.fn(),
				},
			},
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});

		await analytics.trackEvent(EVENT);

		expect(fetchMock).toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("400"));
	});

	it("확장에서 setUserId를 부르면 user_id를 storage에도 남긴다", async () => {
		const set = vi.fn();
		stubChromeStorage({ set });

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});
		analytics.setUserId("user-1");

		expect(set).toHaveBeenCalledWith({ analyticsUserId: "user-1" });
		expect(gtag).not.toHaveBeenCalled();
	});

	it("웹에서 setUserId를 부르면 gtag 자동 이벤트에도 실리도록 set으로 user_id를 정한다", async () => {
		window.gtag = gtag;
		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});

		analytics.setUserId("user-1");

		expect(gtag).toHaveBeenCalledWith("set", { user_id: "user-1" });
	});

	it("웹에서 로그아웃하면 빈 문자열이 아닌 null로 user_id를 지운다", async () => {
		window.gtag = gtag;
		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});

		analytics.setUserId(undefined);

		expect(gtag).toHaveBeenCalledWith("set", { user_id: null });
	});

	it("웹에서 gtag가 아직 없으면 setUserId가 던지지 않는다", async () => {
		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});

		expect(() => analytics.setUserId("user-1")).not.toThrow();
	});

	it("setUserId가 불린 적 없어도 storage에 남은 user_id를 실어 보낸다", async () => {
		stubChromeStorage({
			get: vi.fn().mockResolvedValue({
				clientId: "c",
				analyticsUserId: "user-1",
			}),
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});

		await analytics.trackEvent(EVENT);

		const [, request] = fetchMock.mock.calls[0];
		expect(JSON.parse(request.body).user_id).toBe("user-1");
	});

	it("storage에 운영자 user_id만 있으면 이벤트를 보내지 않는다", async () => {
		stubChromeStorage({
			get: vi.fn().mockResolvedValue({
				analyticsUserId: ANALYTICS_EXCLUDED_USER_ID,
			}),
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});

		await analytics.trackEvent(EVENT);

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("storage 조회 중 로그인하면 최신 user_id를 사용한다", async () => {
		let resolveStoredUserId:
			| ((value: { analyticsUserId: string }) => void)
			| undefined;
		const storedUserIdPromise = new Promise<{ analyticsUserId: string }>(
			(resolve) => {
				resolveStoredUserId = resolve;
			},
		);
		stubChromeStorage({
			get: vi
				.fn()
				.mockImplementationOnce(() => storedUserIdPromise)
				.mockResolvedValue({ clientId: "c" }),
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});
		const trackEventPromise = analytics.trackEvent(EVENT);
		analytics.setUserId("latest-user");
		resolveStoredUserId?.({ analyticsUserId: "stored-user" });
		await trackEventPromise;

		const [, request] = fetchMock.mock.calls[0];
		expect(JSON.parse(request.body).user_id).toBe("latest-user");
	});

	it("storage 조회 중 로그아웃하면 저장된 user_id를 복구하지 않는다", async () => {
		let resolveStoredUserId:
			| ((value: { analyticsUserId: string }) => void)
			| undefined;
		const storedUserIdPromise = new Promise<{ analyticsUserId: string }>(
			(resolve) => {
				resolveStoredUserId = resolve;
			},
		);
		stubChromeStorage({
			get: vi
				.fn()
				.mockImplementationOnce(() => storedUserIdPromise)
				.mockResolvedValue({ clientId: "c" }),
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});
		const trackEventPromise = analytics.trackEvent(EVENT);
		analytics.setUserId(undefined);
		resolveStoredUserId?.({ analyticsUserId: "stored-user" });
		await trackEventPromise;

		const [, request] = fetchMock.mock.calls[0];
		expect(JSON.parse(request.body).user_id).toBeUndefined();
	});

	it("storage 조회가 실패해도 조회 중 설정된 운영자 user_id를 우선한다", async () => {
		let rejectStoredUserId: ((reason?: unknown) => void) | undefined;
		const storedUserIdPromise = new Promise<never>((_resolve, reject) => {
			rejectStoredUserId = reject;
		});
		stubChromeStorage({
			get: vi.fn().mockImplementationOnce(() => storedUserIdPromise),
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});
		const trackEventPromise = analytics.trackEvent(EVENT);
		analytics.setUserId(ANALYTICS_EXCLUDED_USER_ID);
		rejectStoredUserId?.(new Error("storage read failed"));
		await trackEventPromise;

		expect(fetchMock).not.toHaveBeenCalled();
		expect(console.warn).not.toHaveBeenCalledWith(
			expect.stringContaining("storage에서 읽지 못했습니다"),
		);
	});

	it("storage 조회가 실패해도 조회 중 설정된 최신 user_id로 전송한다", async () => {
		let rejectStoredUserId: ((reason?: unknown) => void) | undefined;
		const storedUserIdPromise = new Promise<never>((_resolve, reject) => {
			rejectStoredUserId = reject;
		});
		stubChromeStorage({
			get: vi
				.fn()
				.mockImplementationOnce(() => storedUserIdPromise)
				.mockResolvedValue({ clientId: "c" }),
		});

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});
		const trackEventPromise = analytics.trackEvent(EVENT);
		analytics.setUserId("latest-user");
		rejectStoredUserId?.(new Error("storage read failed"));
		await trackEventPromise;

		const [, request] = fetchMock.mock.calls[0];
		expect(JSON.parse(request.body).user_id).toBe("latest-user");
	});

	it("로그아웃하면 storage에 남긴 user_id를 지운다", async () => {
		const remove = vi.fn();
		stubChromeStorage({ remove });

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: true,
		});
		analytics.setUserId(undefined);

		expect(remove).toHaveBeenCalledWith("analyticsUserId");
	});

	it("웹에서는 user_id를 storage에 남기지 않는다", async () => {
		const set = vi.fn();
		stubChromeStorage({ set });

		const analytics = await loadAnalytics({
			buildEnv: "production",
			isExtension: false,
		});
		analytics.setUserId("user-1");

		expect(set).not.toHaveBeenCalled();
	});
});
