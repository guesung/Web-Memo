import { getSentryApiToken } from "./config";

/** Sentry 조직 slug. 환경마다 다르지 않아 상수로 둡니다. */
export const SENTRY_ORGANIZATION_SLUG = "guesung";

const SENTRY_API_ORIGIN = "https://sentry.io/api/0";
const FETCH_TIMEOUT_MS = 5000;

/** 이벤트 API 응답 중 쓰는 필드만. 비신뢰 데이터라 모두 선택값으로 다룹니다. */
export interface IFSentryEventResponse {
	eventID?: string;
	dateCreated?: string;
	release?: { version?: string } | string | null;
	tags?: { key?: string; value?: string }[];
	contexts?: {
		browser?: { name?: string; version?: string };
		os?: { name?: string; version?: string };
	};
	entries?: { type?: string; data?: unknown }[];
}

/**
 * 이슈의 대표(recommended) 이벤트를 조회합니다.
 *
 * @description 알림을 유발한 이벤트와 다를 수 있습니다. 알림 경로를 막지 않도록
 * 토큰 없음·타임아웃·비정상 응답은 모두 던지지 않고 null을 돌려줍니다.
 */
export const fetchSentryRecommendedEvent = async (
	issueId: string,
): Promise<IFSentryEventResponse | null> => {
	const token = getSentryApiToken();

	if (!token) return null;

	try {
		const response = await fetch(
			`${SENTRY_API_ORIGIN}/organizations/${SENTRY_ORGANIZATION_SLUG}/issues/${encodeURIComponent(issueId)}/events/recommended/`,
			{
				headers: { authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			},
		);

		if (!response.ok) {
			console.error(`Sentry 이벤트 조회 실패: ${response.status}`);

			return null;
		}

		return (await response.json()) as IFSentryEventResponse;
	} catch (error) {
		console.error("Sentry 이벤트 조회 중 예외:", error);

		return null;
	}
};
