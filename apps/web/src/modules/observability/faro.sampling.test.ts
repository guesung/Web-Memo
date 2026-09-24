// @vitest-environment jsdom

import {
	BaseTransport,
	initializeFaro,
	SessionInstrumentation,
	type TransportItem,
} from "@grafana/faro-web-sdk";
import { afterEach, describe, expect, it } from "vitest";
import { getMemoRoute } from "./client";
import { createMemoFaroBeforeSend } from "./faro";

class FaroCaptureTransport extends BaseTransport {
	readonly name = "faro-capture-test";
	readonly version = "1.0.0";
	readonly items: TransportItem[] = [];

	send(items: TransportItem | TransportItem[]): void {
		this.items.push(...(Array.isArray(items) ? items : [items]));
	}
}

afterEach(() => {
	window.sessionStorage.clear();
});

describe("Faro 세션 샘플링", () => {
	it("실제 SDK가 표본 세션은 전송하고 제외 세션은 차단한다", () => {
		const sampledTransport = sendMeasurementWithSamplingRate(1);
		const unsampledTransport = sendMeasurementWithSamplingRate(0);

		expect(sampledTransport.items).toHaveLength(1);
		expect(sampledTransport.items[0]?.meta.session).toEqual({
			id: expect.any(String),
		});
		expect(unsampledTransport.items).toHaveLength(0);
	});
});

const sendMeasurementWithSamplingRate = (
	samplingRate: number,
): FaroCaptureTransport => {
	window.sessionStorage.clear();
	const transport = new FaroCaptureTransport();
	const faro = initializeFaro({
		isolate: true,
		globalObjectKey: `faroSamplingTest${samplingRate}`,
		app: { name: "web-memo-web" },
		transports: [transport],
		sessionTracking: { samplingRate },
		instrumentations: [new SessionInstrumentation()],
		batching: { enabled: false },
		beforeSend: createMemoFaroBeforeSend({ normalizeRoute: getMemoRoute }),
	});

	faro?.api.pushMeasurement(
		{ type: "memo_page_latency", values: { duration_ms: 42 } },
		{
			context: {
				route: "/memos",
				stage: "content_ready",
				navigation: "hard_load",
				outcome: "success",
			},
		},
	);

	return transport;
};
