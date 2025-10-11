import { CONFIG } from "@web-memo/env";
import { isExtension, isProduction } from "./Environment";

declare global {
	interface Window {
		gtag: (
			command: "event",
			action: string,
			parameters: {
				event_category?: string;
				engagement_time_msec?: number;
				custom_parameters?: Record<string, any>;
			},
		) => void;
	}
}

interface GA4Event {
	event_category?: "engagement" | "core_action";
	engagement_time_msec?: number;
	custom_parameters?: Record<string, any>;
}

interface AnalyticsEvent {
	name: string;
	params?: Record<string, any>;
}

class Analytics {
	private static instance: Analytics;
	private gaId: string;
	private apiSecret: string;
	private isInitialized = false;
	private readonly GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
	private readonly DEFAULT_ENGAGEMENT_TIME_IN_MSEC = 100;
	private readonly SESSION_EXPIRATION_IN_MIN = 30;

	private constructor() {
		this.gaId = CONFIG.gaId;
		this.apiSecret = CONFIG.gaApiSecret;
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

	public async trackSidePanelOpen(): Promise<void> {
		if (!isProduction()) return;

		await this.initialize();

		await this.sendEvent("side_panel_open", {
			event_category: "engagement",
			engagement_time_msec: 100,
			custom_parameters: {
				engagement_type: "touch",
			},
		});
	}

	public async trackMemoWrite(): Promise<void> {
		if (!isProduction()) return;

		await this.initialize();

		await this.sendEvent("memo_write", {
			event_category: "core_action",
			engagement_time_msec: 500,
			custom_parameters: {
				engagement_type: "active_use",
			},
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
			event_category: parameters.event_category,
			engagement_time_msec: parameters.engagement_time_msec,
			custom_parameters: parameters.custom_parameters,
		});
	}

	private async sendEventInExtension(
		eventName: string,
		parameters: GA4Event,
	): Promise<void> {
		try {
			const clientId = await this.getOrCreateClientId();
			const sessionId = await this.getOrCreateSessionId();

			const payload = {
				client_id: clientId,
				events: [
					{
						name: eventName,
						params: {
							session_id: sessionId,
							engagement_time_msec:
								parameters.engagement_time_msec ||
								this.DEFAULT_ENGAGEMENT_TIME_IN_MSEC,
							event_category: parameters.event_category,
							...parameters.custom_parameters,
						},
					},
				],
			};

			const url = `${this.GA_ENDPOINT}?measurement_id=${this.gaId}&api_secret=${this.apiSecret}`;

			await fetch(url, {
				method: "POST",
				body: JSON.stringify(payload),
			});
		} catch (_error) {
			console.warn("GA4 Analytics tracking failed:", _error);
		}
	}

	async trackEvent(event: AnalyticsEvent): Promise<void> {
		if (!isProduction()) return;

		await this.initialize();

		await this.sendEvent(event.name, {
			event_category: "engagement",
			engagement_time_msec: this.DEFAULT_ENGAGEMENT_TIME_IN_MSEC,
			custom_parameters: event.params,
		});
	}

	/**
	 * 페이지 뷰 추적 (Chrome 문서 표준)
	 */
	async trackPageView(pageTitle: string, pageLocation: string): Promise<void> {
		await this.trackEvent({
			name: "page_view",
			params: {
				page_title: pageTitle,
				page_location: pageLocation,
			},
		});
	}

	/**
	 * 버튼 클릭 추적
	 */
	async trackButtonClick(buttonId: string, buttonText?: string): Promise<void> {
		await this.trackEvent({
			name: "button_clicked",
			params: {
				button_id: buttonId,
				button_text: buttonText,
			},
		});
	}

	/**
	 * 에러 추적 (Service Worker용)
	 */
	async trackError(errorMessage: string, errorStack?: string): Promise<void> {
		await this.trackEvent({
			name: "extension_error",
			params: {
				error_message: errorMessage,
				error_stack: errorStack,
			},
		});
	}

	/**
	 * Extension 환경에서 고유한 Client ID 생성 또는 가져오기 (Chrome 문서 표준)
	 */
	private async getOrCreateClientId(): Promise<string> {
		if (!isExtension()) return "web-client";

		try {
			// Chrome Storage에서 Client ID 가져오기
			const result = await chrome.storage.local.get("clientId");
			let clientId = result.clientId;

			if (!clientId) {
				// Generate a unique client ID, the actual value is not relevant
				clientId = self.crypto.randomUUID();
				await chrome.storage.local.set({ clientId });
			}

			return clientId;
		} catch (_error) {
			// 오류 시 세션 기반 ID 반환
			return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
		}
	}

	/**
	 * Session ID 생성 또는 가져오기 (Chrome 문서 표준)
	 */
	private async getOrCreateSessionId(): Promise<string> {
		try {
			// Store session in memory storage
			let { sessionData } = await chrome.storage.session.get("sessionData");

			// Check if session exists and is still valid
			const currentTimeInMs = Date.now();
			if (sessionData && sessionData.timestamp) {
				// Calculate how long ago the session was last updated
				const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
				// Check if last update lays past the session expiration threshold
				if (durationInMin > this.SESSION_EXPIRATION_IN_MIN) {
					// Delete old session id to start a new session
					sessionData = null;
				} else {
					// Update timestamp to keep session alive
					sessionData.timestamp = currentTimeInMs;
					await chrome.storage.session.set({ sessionData });
				}
			}

			if (!sessionData) {
				// Create and store a new session
				sessionData = {
					session_id: currentTimeInMs.toString(),
					timestamp: currentTimeInMs,
				};
				await chrome.storage.session.set({ sessionData });
			}

			return sessionData.session_id;
		} catch (_error) {
			// Fallback to timestamp-based session ID
			return Date.now().toString();
		}
	}
}

export const analytics = Analytics.getInstance();
