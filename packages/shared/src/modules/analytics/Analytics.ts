import { CONFIG } from "@web-memo/env";

import { ANALYTICS } from "../../constants";
import { isExtension } from "../../utils";
import {
	EVENT_CATEGORY,
	type IFGa4EventParams,
	type TAnalyticsEvent,
} from "./type";

/** core_action 이벤트의 참여 시간. 사용자가 의도를 갖고 한 동작이라 길게 잡습니다. */
const CORE_ACTION_ENGAGEMENT_TIME_MSEC = 500;
/** engagement 이벤트의 참여 시간. */
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;

class Analytics {
	private static instance: Analytics;
	private gaId: string;
	private apiSecret: string;
	private userId: string | undefined = undefined;
	private readonly GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
	private readonly SESSION_EXPIRATION_IN_MIN = 30;

	private constructor() {
		this.gaId = ANALYTICS.gaId;
		this.apiSecret = ANALYTICS.gaApiSecret;
	}

	public setUserId(userId: string | undefined): void {
		this.userId = userId;
	}

	public static getInstance(): Analytics {
		if (!Analytics.instance) {
			Analytics.instance = new Analytics();
		}
		return Analytics.instance;
	}

	/**
	 * GA4로 이벤트를 전송할지 여부.
	 * 개발 빌드는 보내지 않습니다. staging은 테섭에서 실제 도착을 확인해야 하므로 보냅니다.
	 */
	private shouldSend(): boolean {
		return CONFIG.buildEnv !== "development";
	}

	/**
	 * 콘솔에 이벤트를 찍을지 여부.
	 * 개발과 staging에서 켜집니다. 로깅이 나갔는지 눈으로 확인할 수 있는 유일한 수단입니다.
	 */
	private shouldLogToConsole(): boolean {
		return CONFIG.buildEnv !== "production";
	}

	/** staging에서만 참. GA4 DebugView에 실시간으로 표시되게 합니다. */
	private isDebugMode(): boolean {
		return CONFIG.buildEnv === "staging";
	}

	async trackEvent(event: TAnalyticsEvent): Promise<void> {
		const parameters = this.buildParameters(event);

		if (this.shouldLogToConsole()) {
			console.info(`[analytics] ${event.name}`, parameters);
		}

		if (!this.shouldSend()) return;

		await this.sendEvent(event.name, parameters);
	}

	/**
	 * 이벤트별 파라미터에 모든 이벤트가 공유하는 값을 얹습니다.
	 * @description 호출부가 매번 적지 않게 여기서 한 번에 붙입니다. 빠뜨리는 곳이 생기지 않게 하는 게 목적입니다.
	 */
	private buildParameters(event: TAnalyticsEvent): IFGa4EventParams {
		const eventCategory = EVENT_CATEGORY[event.name];

		return {
			...("params" in event ? event.params : {}),
			event_category: eventCategory,
			engagement_time_msec:
				eventCategory === "core_action"
					? CORE_ACTION_ENGAGEMENT_TIME_MSEC
					: DEFAULT_ENGAGEMENT_TIME_MSEC,
			build_env: CONFIG.buildEnv,
			...(this.isDebugMode() ? { debug_mode: true as const } : {}),
		};
	}

	private async sendEvent(
		eventName: string,
		parameters: IFGa4EventParams,
	): Promise<void> {
		if (isExtension()) {
			await this.sendEventInExtension(eventName, parameters);
			return;
		}

		this.sendEventInWeb(eventName, parameters);
	}

	private sendEventInWeb(
		eventName: string,
		parameters: IFGa4EventParams,
	): void {
		if (typeof window === "undefined" || !("gtag" in window)) {
			console.warn(
				`[analytics] gtag를 찾지 못해 "${eventName}"을 전송하지 못했습니다. GoogleAnalytics 스크립트가 로드됐는지 확인하세요.`,
			);
			return;
		}

		window.gtag("event", eventName, {
			...parameters,
			user_id: this.userId,
		});
	}

	private async sendEventInExtension(
		eventName: string,
		parameters: IFGa4EventParams,
	): Promise<void> {
		try {
			const clientId = await this.getOrCreateClientId();
			const sessionId = await this.getOrCreateSessionId();

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

			if (this.userId) {
				payload.user_id = this.userId;
			}

			const url = `${this.GA_ENDPOINT}?measurement_id=${this.gaId}&api_secret=${this.apiSecret}`;

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
	}

	private async getOrCreateClientId(): Promise<string> {
		if (!isExtension()) return "web-client";

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
	}

	private async getOrCreateSessionId(): Promise<string> {
		try {
			let { sessionData } = await chrome.storage.session.get("sessionData");

			const currentTimeInMs = Date.now();
			if (sessionData?.timestamp) {
				const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
				if (durationInMin > this.SESSION_EXPIRATION_IN_MIN) {
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
	}

	public async trackSidePanelOpen(): Promise<void> {
		await this.trackEvent({ name: "side_panel_open" });
	}

	public async trackMemoWrite(): Promise<void> {
		await this.trackEvent({ name: "memo_write" });
	}

	public async trackPageView(
		pageTitle: string,
		pageLocation: string,
	): Promise<void> {
		await this.trackEvent({
			name: "page_view",
			params: { page_title: pageTitle, page_location: pageLocation },
		});
	}
}

export const analytics = Analytics.getInstance();
