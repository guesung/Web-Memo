// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
});
