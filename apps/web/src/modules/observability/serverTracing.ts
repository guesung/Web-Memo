import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import type {
	ReadableSpan,
	SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { startSpan } from "@sentry/nextjs";
import { after } from "next/server";

/** 메모 화면에서 서버 지연을 추적할 때 허용하는 경로입니다. */
type TMemoRoute = "/memos" | "/memos/wish" | "/memos/star" | "/memos/reading";

/** Supabase가 오류를 반환값에 담는 조회 결과입니다. */
interface IFMemoQueryResult {
	error?: unknown;
}

const MEMO_ROUTES: ReadonlySet<string> = new Set([
	"/memos",
	"/memos/wish",
	"/memos/star",
	"/memos/reading",
]);

/** 분리된 Next.js 서버 번들 사이에서 exporter를 공유하는 서버 전역 상태입니다. */
type TTracingGlobal = typeof globalThis & {
	__webMemoGrafanaSpanProcessor?: SpanProcessor;
};

const tracingGlobal = globalThis as TTracingGlobal;
const warnedFailures = new Set<string>();

const warnOnce = (code: string): void => {
	if (warnedFailures.has(code)) {
		return;
	}

	warnedFailures.add(code);
	console.warn(`[memo-observability] ${code}`);
};

/** Sentry가 소유한 OpenTelemetry provider에 정제된 Grafana exporter를 연결합니다. */
export const createGrafanaSpanProcessors = (): SpanProcessor[] => {
	const endpoint = process.env.GRAFANA_OTLP_ENDPOINT;
	const authorization = process.env.GRAFANA_OTLP_AUTHORIZATION;

	if (!endpoint && !authorization) {
		return [];
	}
	if (!endpoint || !authorization) {
		warnOnce("grafana_otlp_partial_configuration");
		return [];
	}

	let url: URL;
	try {
		url = new URL(endpoint);
	} catch {
		warnOnce("grafana_otlp_invalid_endpoint");
		return [];
	}

	if (url.protocol !== "https:") {
		warnOnce("grafana_otlp_invalid_endpoint");
		return [];
	}

	const exporter = new OTLPTraceExporter({
		url: url.toString(),
		headers: { Authorization: authorization },
		concurrencyLimit: 2,
	});
	const batchProcessor = new BatchSpanProcessor(exporter, {
		maxExportBatchSize: 20,
		maxQueueSize: 100,
		scheduledDelayMillis: 5000,
		exportTimeoutMillis: 3000,
	});

	// SDK의 자동 span에는 URL·쿼리·사용자 정보가 포함될 수 있으므로 큐에 넣기 전에 제거합니다.
	const grafanaSpanProcessor: SpanProcessor = {
		onStart: () => {},
		onEnd: (span) => {
			if (span.name !== "app.memo.prefetch") {
				return;
			}

			const route = span.attributes["app.route"];
			if (typeof route !== "string" || !MEMO_ROUTES.has(route)) {
				return;
			}

			batchProcessor.onEnd(sanitizeMemoSpan(span, route));
		},
		forceFlush: () => batchProcessor.forceFlush(),
		shutdown: () => batchProcessor.shutdown(),
	};
	tracingGlobal.__webMemoGrafanaSpanProcessor = grafanaSpanProcessor;

	return [grafanaSpanProcessor];
};

/** 서버의 메모 프리패치 시간을 기록하고 응답 후 OTLP 전송을 예약합니다. */
export const traceMemoPrefetch = async <TResult extends IFMemoQueryResult>({
	route,
	queryFn,
}: {
	route: TMemoRoute;
	queryFn: () => PromiseLike<TResult>;
}): Promise<TResult> => {
	try {
		return await startSpan(
			{
				name: "app.memo.prefetch",
				op: "db.query",
				attributes: { "app.route": route },
			},
			async (span) => {
				try {
					const result = await queryFn();
					span.setAttribute("app.outcome", result.error ? "error" : "success");

					return result;
				} catch (error) {
					span.setAttribute("app.outcome", "error");
					throw error;
				}
			},
		);
	} finally {
		if (tracingGlobal.__webMemoGrafanaSpanProcessor) {
			after(async () => {
				try {
					await tracingGlobal.__webMemoGrafanaSpanProcessor?.forceFlush();
				} catch {
					warnOnce("grafana_otlp_export_failed");
				}
			});
		}
	}
};

const sanitizeMemoSpan = (span: ReadableSpan, route: string): ReadableSpan => {
	const context = span.spanContext();
	const outcome =
		span.attributes["app.outcome"] === "error" ? "error" : "success";

	return {
		name: "app.memo.prefetch",
		kind: span.kind,
		spanContext: () => ({
			traceId: context.traceId,
			spanId: context.spanId,
			traceFlags: context.traceFlags,
		}),
		startTime: span.startTime,
		endTime: span.endTime,
		status: { code: span.status.code },
		attributes: { "app.route": route, "app.outcome": outcome },
		links: [],
		events: [],
		duration: span.duration,
		ended: span.ended,
		resource: resourceFromAttributes({ "service.name": "web-memo-web" }),
		instrumentationScope: { name: "web-memo.memo" },
		droppedAttributesCount: 0,
		droppedEventsCount: 0,
		droppedLinksCount: 0,
	};
};
