"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { useReportWebVitals } from "next/web-vitals";

export default function WebVitals() {
	useReportWebVitals((metric) => {
		sendGTMEvent({
			event: metric.name,
			eventCategory: "Web Vitals",
			eventAction: metric.name,
			eventLabel: metric.id,
			value: Math.round(
				metric.name === "CLS" ? metric.value * 1000 : metric.value,
			),
		});
	});

	return null;
}
