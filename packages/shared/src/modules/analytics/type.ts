declare global {
	interface Window {
		gtag: (command: "event", action: string, parameters: GA4Event) => void;
	}
}

export type EventCategory = "engagement" | "core_action";
export interface GA4Event {
	event_category?: EventCategory;
	engagement_time_msec?: number;

	page_title?: string;
	page_location?: string;

	button_id?: string;
	button_text?: string;
}

export interface AnalyticsEvent {
	name: string;
	params?: GA4Event;
}
