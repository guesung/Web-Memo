import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemoRoute } from "./client";
import { initializeMemoFaro } from "./faro";

const { initializeFaroMock } = vi.hoisted(() => ({
	initializeFaroMock: vi.fn(),
}));

vi.mock("@grafana/faro-web-sdk", () => ({
	faro: { api: null },
	initializeFaro: initializeFaroMock,
	TransportItemType: { MEASUREMENT: "measurement" },
}));

afterEach(() => initializeFaroMock.mockClear());

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

		expect(configuration.instrumentations).toEqual([]);
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
				page: { url: "https://webmemo.xyz/ko/memos/star?q=private" },
				user: { email: "private@example.com" },
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
				app: { name: "web-memo-web" },
				page: { url: "/memos/wish" },
			},
		});
	});
});
