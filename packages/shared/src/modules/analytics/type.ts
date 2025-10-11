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

export interface GA4Event {
	event_category?: "engagement" | "core_action";
	engagement_time_msec?: number;
	custom_parameters?: Record<string, any>;
}

export interface AnalyticsEvent {
	name: string;
	params?: Record<string, any>;
}
