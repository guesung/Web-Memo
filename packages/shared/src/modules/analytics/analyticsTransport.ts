import { ANALYTICS } from "../../constants";
import { isExtension } from "../../utils";
import type { IFGa4EventParams } from "./type";

/** 분석 이벤트 전송에 필요한 값입니다. */
type TSendEventParams = {
	eventName: string;
	parameters: IFGa4EventParams;
	userId: string | undefined;
};

/** 웹 또는 확장 전송 계층으로 분석 이벤트를 보냅니다. */
export const sendEvent = async (
	sendEventParams: TSendEventParams,
): Promise<void> => {
	if (isExtension()) {
		await sendEventInExtension(sendEventParams);
		return;
	}

	sendEventInWeb(sendEventParams);
};

const sendEventInWeb = (sendEventParams: TSendEventParams): void => {
	const { eventName, parameters, userId } = sendEventParams;

	if (typeof window === "undefined" || !("gtag" in window)) {
		console.warn(
			`[analytics] gtag를 찾지 못해 "${eventName}"을 전송하지 못했습니다. GoogleAnalytics 스크립트가 로드됐는지 확인하세요.`,
		);
		return;
	}

	window.gtag("event", eventName, {
		...parameters,
		user_id: userId,
	});
};

const sendEventInExtension = async (
	sendEventParams: TSendEventParams,
): Promise<void> => {
	const { eventName, parameters, userId } = sendEventParams;

	try {
		const clientId = await getOrCreateClientId();
		const sessionId = await getOrCreateSessionId();
		const payload: {
			client_id: string;
			user_id?: string;
			events: Array<{
				name: string;
				params: IFGa4EventParams;
			}>;
		} = {
			client_id: clientId,
			events: [
				{
					name: eventName,
					params: {
						session_id: sessionId,
						...parameters,
					},
				},
			],
		};

		if (userId) {
			payload.user_id = userId;
		}

		const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ANALYTICS.gaId}&api_secret=${ANALYTICS.gaApiSecret}`;

		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.warn(
				`[analytics] "${eventName}" 전송이 ${response.status}로 실패했습니다.`,
			);
		}
	} catch (error) {
		console.warn(`[analytics] "${eventName}" 전송에 실패했습니다.`, error);
	}
};

/** 확장 저장소에 유지되는 분석 client_id를 조회하거나 생성합니다. */
export const getOrCreateClientId = async (): Promise<string> => {
	if (!isExtension()) {
		return "web-client";
	}

	try {
		const result = await chrome.storage.local.get("clientId");
		let clientId = result.clientId;

		if (!clientId) {
			clientId = self.crypto.randomUUID();
			await chrome.storage.local.set({ clientId });
		}

		return clientId;
	} catch (_error) {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}
};

const getOrCreateSessionId = async (): Promise<string> => {
	try {
		let { sessionData } = await chrome.storage.session.get("sessionData");

		const currentTimeInMs = Date.now();
		if (sessionData?.timestamp) {
			const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
			if (durationInMin > 30) {
				sessionData = null;
			} else {
				sessionData.timestamp = currentTimeInMs;
				await chrome.storage.session.set({ sessionData });
			}
		}

		if (!sessionData) {
			sessionData = {
				session_id: currentTimeInMs.toString(),
				timestamp: currentTimeInMs,
			};
			await chrome.storage.session.set({ sessionData });
		}

		return sessionData.session_id;
	} catch (_error) {
		return Date.now().toString();
	}
};
