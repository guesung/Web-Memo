import { CONFIG } from "@web-memo/env";
import { isExtension, isProduction } from "../../utils";
import type { AnalyticsEvent, GA4Event } from "./type";

class Analytics {
	private static instance: Analytics;
	private gaId: string;
	private apiSecret: string;
	private isInitialized = false;
	private userId: string | undefined = undefined;
	private readonly GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
	private readonly DEFAULT_ENGAGEMENT_TIME_IN_MSEC = 100;
	private readonly SESSION_EXPIRATION_IN_MIN = 30;

	private constructor() {
		this.gaId = CONFIG.gaId;
		this.apiSecret = CONFIG.gaApiSecret;
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

	private async initialize(): Promise<void> {
		if (this.isInitialized) return;

		if (isExtension()) {
			this.isInitialized = true;
		} else {
			if (typeof window !== "undefined" && "gtag" in window) {
				this.isInitialized = true;
			}
		}
	}

	async trackEvent(event: AnalyticsEvent): Promise<void> {
		if (!isProduction()) return;

		await this.initialize();

		const { event_category, engagement_time_msec, ...customParams } =
			event.params || {};

		await this.sendEvent(event.name, {
			event_category,
			engagement_time_msec,
			...customParams,
		});
	}

	private async sendEvent(
		eventName: string,
		parameters: GA4Event,
	): Promise<void> {
		if (isExtension()) {
			await this.sendEventInExtension(eventName, parameters);
		} else {
			if (typeof window !== "undefined" && "gtag" in window) {
				await this.sendEventInWeb(eventName, parameters);
			}
		}
	}

	private async sendEventInWeb(
		eventName: string,
		parameters: GA4Event,
	): Promise<void> {
		window.gtag("event", eventName, {
			...parameters,
			user_id: this.userId,
		});
	}

	private async sendEventInExtension(
		eventName: string,
		parameters: GA4Event,
	): Promise<void> {
		try {
			const clientId = await this.getOrCreateClientId();
			const sessionId = await this.getOrCreateSessionId();

			const payload: {
				client_id: string;
				user_id?: string;
				events: Array<{
					name: string;
					params: Record<string, unknown>;
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

			await fetch(url, {
				method: "POST",
				body: JSON.stringify(payload),
			});
		} catch (_error) {
			console.warn("GA4 Analytics tracking failed:", _error);
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
		await this.trackEvent({
			name: "side_panel_open",
			params: {
				event_category: "engagement",
				engagement_time_msec: 100,
			},
		});
	}

	public async trackMemoWrite(): Promise<void> {
		await this.trackEvent({
			name: "memo_write",
			params: {
				event_category: "core_action",
				engagement_time_msec: 500,
			},
		});
	}

	async trackPageView(pageTitle: string, pageLocation: string): Promise<void> {
		await this.trackEvent({
			name: "page_view",
			params: {
				page_title: pageTitle,
				page_location: pageLocation,
			},
		});
	}

	async trackButtonClick(buttonId: string, buttonText?: string): Promise<void> {
		await this.trackEvent({
			name: "button_clicked",
			params: {
				button_id: buttonId,
				button_text: buttonText,
			},
		});
	}
}

export const analytics = Analytics.getInstance();
