"use client";

import { ANALYTICS } from "@web-memo/shared/constants";
import { useEffect } from "react";

/** GA와 GTM 이벤트는 레이아웃의 dataLayer에 먼저 쌓고, 외부 파일만 뒤에 받는다. */
export default function DeferredAnalytics() {
	useEffect(() => {
		let started = false;
		let idleId: number | undefined;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const loadScripts = () => {
			if (started) return;
			started = true;
			window.removeEventListener("pointerdown", loadScripts);
			window.removeEventListener("keydown", loadScripts);

			for (const [id, src] of [
				[
					"deferred-ga",
					`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.gaId}`,
				],
				[
					"deferred-gtm",
					`https://www.googletagmanager.com/gtm.js?id=${ANALYTICS.gtmId}`,
				],
			]) {
				if (document.getElementById(id)) continue;
				const script = document.createElement("script");
				script.id = id;
				script.async = true;
				script.src = src;
				document.head.appendChild(script);
			}
		};

		const scheduleLoad = () => {
			if ("requestIdleCallback" in window) {
				idleId = window.requestIdleCallback(loadScripts, { timeout: 5000 });
			} else {
				timeoutId = setTimeout(loadScripts, 2000);
			}
		};

		window.addEventListener("pointerdown", loadScripts, { once: true });
		window.addEventListener("keydown", loadScripts, { once: true });
		if (document.readyState === "complete") {
			scheduleLoad();
		} else {
			window.addEventListener("load", scheduleLoad, { once: true });
		}

		return () => {
			window.removeEventListener("pointerdown", loadScripts);
			window.removeEventListener("keydown", loadScripts);
			window.removeEventListener("load", scheduleLoad);
			if (idleId !== undefined) window.cancelIdleCallback(idleId);
			if (timeoutId !== undefined) clearTimeout(timeoutId);
		};
	}, []);

	return null;
}
