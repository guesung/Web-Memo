// `@src/modules/ga` 배럴에서 내보내지 않습니다. 이 파일은 `@web-memo/env`를 import하므로,
// 배럴에 넣으면 GA Data API만 쓰는 라우트와 그 테스트까지 WEB_URL이 필요해집니다.
import { CONFIG } from "@web-memo/env";
import { ANALYTICS, GA_CLIENT_ID_PATTERN } from "@web-memo/shared/constants";
import type {
	TAnalyticsEventName,
	TEventCategory,
} from "@web-memo/shared/modules/analytics";

/** GA 응답을 기다리는 최대 시간. 백그라운드 작업이 함수 실행 시간을 붙잡지 않게 합니다. */
const MEASUREMENT_PROTOCOL_TIMEOUT_MSEC = 2_000;

/**
 * 요청으로 받은 client_id를 GA에 실어도 되는 값으로 바꿉니다.
 * @description 형식이 맞지 않거나 없으면 새 UUID를 돌려줍니다. 사용자는 이어 붙지 않지만
 * 이벤트 건수는 남습니다.
 */
export const resolveMeasurementClientId = (
	rawClientId: string | null | undefined,
): string =>
	rawClientId && GA_CLIENT_ID_PATTERN.test(rawClientId)
		? rawClientId
		: crypto.randomUUID();

interface SendMeasurementProtocolEventParams {
	clientId: string;
	name: TAnalyticsEventName;
	category: TEventCategory;
	params?: Record<string, string | number | boolean>;
}

/**
 * 웹 서버에서 GA4 Measurement Protocol로 이벤트 하나를 보냅니다.
 *
 * @description 브라우저의 gtag는 광고 차단기에 막히지만 서버 전송은 막히지 않습니다.
 * development에서는 보내지 않고, staging에서는 DebugView에 보이도록 `debug_mode`를 붙입니다.
 * 실패해도 던지지 않습니다. 오류 객체에는 요청 URL의 `api_secret`이나 client_id가 섞일 수
 * 있어 로그에는 이벤트 이름과 상태 코드만 남깁니다.
 */
export const sendMeasurementProtocolEvent = async ({
	clientId,
	name,
	category,
	params,
}: SendMeasurementProtocolEventParams): Promise<void> => {
	if (CONFIG.buildEnv === "development") return;

	const url = new URL("https://www.google-analytics.com/mp/collect");
	url.searchParams.set("measurement_id", ANALYTICS.gaId);
	url.searchParams.set("api_secret", ANALYTICS.gaApiSecret);

	try {
		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify({
				client_id: clientId,
				events: [
					{
						name,
						params: {
							event_category: category,
							engagement_time_msec: 100,
							session_id: Date.now().toString(),
							...params,
							build_env: CONFIG.buildEnv,
							...(CONFIG.buildEnv === "staging" ? { debug_mode: true } : {}),
						},
					},
				],
			}),
			cache: "no-store",
			signal: AbortSignal.timeout(MEASUREMENT_PROTOCOL_TIMEOUT_MSEC),
		});

		if (!response.ok) {
			console.warn(`[analytics] ${name} 전송 실패`, response.status);
		}
	} catch {
		console.warn(`[analytics] ${name} 전송 실패`);
	}
};
