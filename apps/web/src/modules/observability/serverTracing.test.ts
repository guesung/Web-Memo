import { resourceFromAttributes } from "@opentelemetry/resources";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGrafanaSpanProcessors } from "./serverTracing";

const mocks = vi.hoisted(() => ({
	onEnd: vi.fn(),
	forceFlush: vi.fn(async () => {}),
	waitUntil: vi.fn(),
	exporter: vi.fn(),
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
	OTLPTraceExporter: class {
		constructor(options: unknown) {
			mocks.exporter(options);
		}
	},
}));
vi.mock("@opentelemetry/sdk-trace-base", () => ({
	BatchSpanProcessor: class {
		onEnd = mocks.onEnd;
		forceFlush = mocks.forceFlush;
		shutdown = vi.fn();
	},
}));
vi.mock("@vercel/functions", () => ({ waitUntil: mocks.waitUntil }));

const createSpan = (
	attributes: ReadableSpan["attributes"] = {},
): ReadableSpan => ({
	name: "GET /[lng]/memos",
	kind: 1,
	spanContext: () => ({
		traceId: "a".repeat(32),
		spanId: "b".repeat(16),
		traceFlags: 1,
	}),
	startTime: [1, 0],
	endTime: [1, 100],
	duration: [0, 100],
	status: { code: 0, message: "private message" },
	attributes: {
		"next.span_type": "BaseServer.handleRequest",
		"http.method": "GET",
		"http.route": "/[lng]/memos",
		"http.target": "/ko/memos?search=private",
		"user.id": "private-user",
		...attributes,
	},
	links: [],
	events: [{ name: "private event", time: [1, 0] }],
	ended: true,
	resource: resourceFromAttributes({
		"service.name": "original",
		secret: "private",
	}),
	instrumentationScope: { name: "private" },
	droppedAttributesCount: 0,
	droppedEventsCount: 0,
	droppedLinksCount: 0,
});

describe("Grafana server request exporter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv(
			"GRAFANA_OTLP_ENDPOINT",
			"https://example.grafana.net/otlp/v1/traces",
		);
		vi.stubEnv("GRAFANA_OTLP_AUTHORIZATION", "Basic test");
	});

	afterEach(() => vi.unstubAllEnvs());

	it.each(["", "http://example.com", "invalid"])(
		"disables invalid endpoint %s",
		(endpoint) => {
			vi.stubEnv("GRAFANA_OTLP_ENDPOINT", endpoint);
			expect(createGrafanaSpanProcessors()).toEqual([]);
			expect(mocks.exporter).not.toHaveBeenCalled();
		},
	);

	it.each(["/memos", "/memos/wish", "/memos/star", "/memos/reading"])(
		"exports sanitized request for %s and schedules flush",
		(route) => {
			const processor = createGrafanaSpanProcessors()[0];
			const original = createSpan({ "http.route": `/[lng]${route}` });
			processor.onEnd(original);
			const exported: ReadableSpan = mocks.onEnd.mock.calls[0][0];
			expect(exported.name).toBe("app.memo.server_request");
			expect(exported.attributes).toEqual({
				"app.route": route,
				"app.outcome": "success",
			});
			expect(exported.status).toEqual({ code: 0 });
			expect(exported.events).toEqual([]);
			expect(exported.resource.attributes).toEqual({
				"service.name": "web-memo-web",
			});
			expect(exported.duration).toEqual(original.duration);
			expect(mocks.forceFlush).toHaveBeenCalledOnce();
			expect(mocks.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
			expect(original.attributes["user.id"]).toBe("private-user");
		},
	);

	it.each([
		{ "http.method": "POST" },
		{ "next.span_type": "AppRender.getBodyResult" },
		{ "http.route": "/[lng]/memos/private-id" },
		{ "http.route": "/[lng]/memos?secret=value" },
		{ "http.route": "/[lng]/settings" },
		{ "http.route": undefined },
	])("drops other requests %j", (attributes) => {
		createGrafanaSpanProcessors()[0].onEnd(createSpan(attributes));
		expect(mocks.onEnd).not.toHaveBeenCalled();
		expect(mocks.waitUntil).not.toHaveBeenCalled();
	});

	it("uses next.route and preserves the error outcome", () => {
		const span = createSpan({
			"http.route": undefined,
			"next.route": "/[lng]/memos",
		});
		span.status.code = 2;
		createGrafanaSpanProcessors()[0].onEnd(span);
		expect(mocks.onEnd.mock.calls[0][0].attributes["app.outcome"]).toBe(
			"error",
		);
	});

	it("absorbs exporter failures in the background promise", async () => {
		mocks.forceFlush.mockRejectedValueOnce(new Error("secret exporter detail"));
		createGrafanaSpanProcessors()[0].onEnd(createSpan());
		await expect(mocks.waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
	});
});
