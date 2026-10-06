import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemoRoute } from "./client";
import { initializeMemoFaro } from "./faro";

const { initializeFaroMock, faroMock } = vi.hoisted(() => ({
	initializeFaroMock: vi.fn(),
	// 실제 faro-core처럼 초기화 전에도 no-op api가 채워져 있고 config는 없다.
	faroMock: { api: { pushMeasurement: () => {} } } as {
		api: { pushMeasurement: () => void };
		config?: object;
	},
}));

vi.mock("@grafana/faro-web-sdk", () => ({
	faro: faroMock,
	initializeFaro: initializeFaroMock,
	SessionInstrumentation: class {},
	TransportItemType: { MEASUREMENT: "measurement" },
}));

afterEach(() => {
	initializeFaroMock.mockClear();
	faroMock.config = undefined;
});

describe("Faro 초기화", () => {
	it("SDK 기본 no-op api만 있는 초기 상태에서 Faro를 초기화한다", () => {
		initializeMemoFaro({
			collectorUrl: "https://collector.example/collect",
			normalizeRoute: getMemoRoute,
		});

		expect(initializeFaroMock).toHaveBeenCalledTimes(1);
	});

	it("이미 등록된 Faro가 있으면 다시 초기화하지 않는다", () => {
		faroMock.config = {};

		initializeMemoFaro({
			collectorUrl: "https://collector.example/collect",
			normalizeRoute: getMemoRoute,
		});

		expect(initializeFaroMock).not.toHaveBeenCalled();
	});
});

describe("Faro 측정값 필터", () => {
	it("배치 전송 시 URL이 바뀌어도 payload 경로만 남기고 개인정보를 제거한다", () => {
		initializeMemoFaro({
			collectorUrl: "https://collector.example/collect",
			normalizeRoute: getMemoRoute,
		});
		const configuration = initializeFaroMock.mock.calls[0]?.[0] as {
			instrumentations: unknown[];
			sessionTracking: { samplingRate: number };
			beforeSend: (item: {
				type: string;
				payload: {
					type: string;
					values: Record<string, number>;
					timestamp: string;
					context: Record<string, string>;
				};
				meta: Record<string, unknown>;
			}) => unknown;
		};

		expect(configuration.instrumentations).toHaveLength(1);
		expect(configuration.sessionTracking).toEqual({ samplingRate: 0.1 });
		const result = configuration.beforeSend({
			type: "measurement",
			payload: {
				type: "memo_page_latency",
				values: { duration_ms: 42, private_value: 1 },
				timestamp: "2026-09-24T00:00:00.000Z",
				context: {
					stage: "content_ready",
					route: "/memos/wish",
					navigation: "hard_load",
					outcome: "success",
					memoBody: "private memo",
				},
			},
			meta: {
				sdk: {
					name: "@grafana/faro-core",
					version: "2.12.1",
					integrations: [{ name: "private-integration", version: "1.0.0" }],
				},
				page: { url: "https://webmemo.xyz/ko/memos/star?q=private" },
				user: { email: "private@example.com" },
				session: {
					id: "anonymous-session-id",
					attributes: { isSampled: "true", private_value: "private" },
				},
			},
		});

		expect(result).toEqual({
			type: "measurement",
			payload: {
				type: "memo_page_latency",
				values: { duration_ms: 42 },
				timestamp: "2026-09-24T00:00:00.000Z",
				context: {
					route: "/memos/wish",
					stage: "content_ready",
					navigation: "hard_load",
					outcome: "success",
				},
			},
			meta: {
				sdk: { name: "@grafana/faro-core", version: "2.12.1" },
				app: { name: "web-memo-web" },
				page: { url: "/memos/wish" },
				session: {
					id: "anonymous-session-id",
					attributes: { isSampled: "true" },
				},
			},
		});
	});

	it("collector가 거부하는 SDK 버전 없는 항목은 보내지 않는다", () => {
		initializeMemoFaro({
			collectorUrl: "https://collector.example/collect",
			normalizeRoute: getMemoRoute,
		});
		const configuration = initializeFaroMock.mock.calls[0]?.[0] as {
			beforeSend: (item: unknown) => unknown;
		};

		const result = configuration.beforeSend({
			type: "measurement",
			payload: {
				type: "memo_page_latency",
				values: { duration_ms: 42 },
				timestamp: "2026-09-24T00:00:00.000Z",
				context: {
					stage: "content_ready",
					route: "/memos",
					navigation: "hard_load",
					outcome: "success",
				},
			},
			meta: {
				session: {
					id: "anonymous-session-id",
					attributes: { isSampled: "true" },
				},
			},
		});

		expect(result).toBeNull();
	});
});
