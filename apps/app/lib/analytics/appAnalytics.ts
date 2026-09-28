import AsyncStorage from "@react-native-async-storage/async-storage";
import { ANALYTICS } from "@web-memo/shared/constants";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";
import {
	buildEventParams,
	buildPayload,
	isSessionExpired,
	isTrackableUser,
	shouldSendEvent,
	type TAppAnalyticsEvent,
} from "./analyticsCore";

const CLIENT_ID_KEY = "webmemo:analyticsClientId";

let analyticsUserId: string | undefined;
let sessionId: string | null = null;
let lastEventAt: number | null = null;
let clientIdPromise: Promise<string> | null = null;

/** GA4로 보낼 user_id를 설정한다. 로그아웃은 undefined. */
export function setAnalyticsUserId(userId: string | undefined): void {
	analyticsUserId = userId;
}

/**
 * GA4로 앱 이벤트를 보낸다.
 * @description 개발 빌드는 콘솔에만 남기고, 실패해도 throw하지 않는다.
 */
export async function trackAppEvent(event: TAppAnalyticsEvent): Promise<void> {
	const params = buildEventParams({
		event,
		environment: {
			isDevelopment: __DEV__,
			appVersion: Constants.expoConfig?.version,
			platform: Platform.OS,
		},
	});

	if (!shouldSendEvent(__DEV__)) {
		console.info(`[analytics] ${event.name}`, params);
		return;
	}

	if (!isTrackableUser(analyticsUserId)) {
		return;
	}

	try {
		const clientId = await getOrCreateClientId();
		const payload = buildPayload({
			clientId,
			userId: analyticsUserId,
			sessionId: getOrCreateSessionId(),
			eventName: event.name,
			params,
		});
		const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ANALYTICS.gaId}&api_secret=${ANALYTICS.gaApiSecret}`;
		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.warn(
				`[analytics] "${event.name}" 전송이 ${response.status}로 실패했습니다.`,
			);
		}
	} catch (error) {
		console.warn(`[analytics] "${event.name}" 전송에 실패했습니다.`, error);
	}
}

function getOrCreateSessionId(): string {
	const now = Date.now();

	if (sessionId === null || isSessionExpired({ lastEventAt, now })) {
		sessionId = now.toString();
	}
	lastEventAt = now;

	return sessionId;
}

function getOrCreateClientId(): Promise<string> {
	if (clientIdPromise === null) {
		clientIdPromise = loadClientId();
	}

	return clientIdPromise;
}

async function loadClientId(): Promise<string> {
	try {
		const stored = await AsyncStorage.getItem(CLIENT_ID_KEY);

		if (stored) {
			return stored;
		}

		const created = randomUUID();
		await AsyncStorage.setItem(CLIENT_ID_KEY, created);

		return created;
	} catch (_error) {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}
}
