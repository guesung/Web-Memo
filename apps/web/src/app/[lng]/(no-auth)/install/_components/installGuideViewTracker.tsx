"use client";

import { analytics } from "@web-memo/shared/modules/analytics";
import { useEffect, useRef } from "react";

export function InstallGuideViewTracker() {
	const hasTracked = useRef(false);

	useEffect(() => {
		if (hasTracked.current) return;
		hasTracked.current = true;
		try {
			window.localStorage.setItem("installGuideVisited", "1");
		} catch {
			// The public guide remains usable when browser storage is disabled.
		}
		void analytics.trackEvent({ name: "install_guide_view" }).catch((error) => {
			console.warn(
				"[analytics] install_guide_view 전송에 실패했습니다.",
				error,
			);
		});
	}, []);

	return null;
}
