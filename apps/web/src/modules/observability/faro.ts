import {
	faro,
	initializeFaro,
	type MeasurementEvent,
	TransportItemType,
} from "@grafana/faro-web-sdk";
import type { TMemoLoadOutcome, TMemoLoadStage, TMemoRoute } from "./client";

/** Faro에 허용된 측정값을 송신할 때 필요한 값. */
interface IFMemoFaroMeasurement {
	route: TMemoRoute;
	stage: TMemoLoadStage;
	navigation: "hard_load" | "client_navigation";
	outcome: TMemoLoadOutcome;
	durationMs: number;
}

/** 자동 계측 없이 허용 목록의 지연 측정값만 Faro로 전송하도록 설정한다. */
export const initializeMemoFaro = ({
	collectorUrl,
	normalizeRoute,
}: {
	collectorUrl: string;
	normalizeRoute: (path: string) => TMemoRoute | null;
}): void => {
	if (faro.api) {
		return;
	}

	try {
		initializeFaro({
			url: collectorUrl,
			app: { name: "web-memo-web" },
			instrumentations: [],
			beforeSend: (item) => {
				if (item.type !== TransportItemType.MEASUREMENT) {
					return null;
				}

				const measurement = item.payload as MeasurementEvent;
				const route = normalizeRoute(measurement.context?.route ?? "");
				const stage = measurement.context?.stage;
				const navigation = measurement.context?.navigation;
				const outcome = measurement.context?.outcome;
				if (
					!route ||
					measurement.type !== "memo_page_latency" ||
					!measurement.values ||
					!Number.isFinite(measurement.values.duration_ms) ||
					!isMemoLoadStage(stage) ||
					(navigation !== "hard_load" && navigation !== "client_navigation") ||
					(outcome !== "success" &&
						outcome !== "empty" &&
						outcome !== "error" &&
						outcome !== "cancelled" &&
						outcome !== "timeout")
				) {
					return null;
				}

				// Faro의 기본 page.url에는 전체 URL과 검색어가 들어가므로 메타도 새로 만든다.
				return {
					type: item.type,
					payload: {
						type: "memo_page_latency",
						values: { duration_ms: measurement.values.duration_ms },
						timestamp: measurement.timestamp,
						context: { route, stage, navigation, outcome },
					},
					meta: { app: { name: "web-memo-web" }, page: { url: route } },
				};
			},
		});
	} catch {
		// 계측 설정 또는 전송 오류가 메모 화면의 로딩을 막지 않도록 한다.
	}
};

/** 앱의 고정된 측정 필드만 SDK 계약에 맞게 context 옵션으로 보낸다. */
export const sendMemoFaroMeasurement = ({
	route,
	stage,
	navigation,
	outcome,
	durationMs,
}: IFMemoFaroMeasurement): void => {
	faro.api?.pushMeasurement(
		{ type: "memo_page_latency", values: { duration_ms: durationMs } },
		{ context: { route, stage, navigation, outcome } },
	);
};

/** 송신 직전에 단계 이름을 다시 검증해 허용된 값만 남긴다. */
const isMemoLoadStage = (stage: string | undefined): stage is TMemoLoadStage =>
	stage === "ttfb" ||
	stage === "fcp" ||
	stage === "shell_ready" ||
	stage === "data_ready" ||
	stage === "content_ready" ||
	stage === "navigation_end";
