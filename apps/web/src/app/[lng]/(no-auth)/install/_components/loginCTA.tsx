"use client";

import type { LanguageType } from "@src/modules/i18n";
import { analytics } from "@web-memo/shared/modules/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useRef } from "react";

export function LoginCTA({ lng, extCid, label }: LoginCTAProps) {
	const router = useRouter();
	const isNavigating = useRef(false);
	const loginPath = `/${lng}/login${extCid ? `?${new URLSearchParams({ ext_cid: extCid })}` : ""}`;

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		const isModifiedClick =
			event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
		if (isNavigating.current && !isModifiedClick) {
			event.preventDefault();
			return;
		}

		try {
			window.localStorage.setItem("installGuideVisited", "1");
		} catch {
			// Navigation still works when browser storage is disabled.
		}

		if (isModifiedClick) {
			void analytics
				.trackEvent({ name: "install_guide_login_click" })
				.catch(reportTrackingError);
			return;
		}

		isNavigating.current = true;
		event.preventDefault();
		void analytics
			.trackEvent({ name: "install_guide_login_click" })
			.catch(reportTrackingError)
			.finally(() => router.push(loginPath));
	}

	return (
		<Link
			href={loginPath}
			onClick={handleClick}
			className="whitespace-nowrap rounded-lg bg-primary px-6 py-3 text-center text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			{label}
		</Link>
	);
}

function reportTrackingError(error: unknown) {
	console.warn(
		"[analytics] install_guide_login_click 전송에 실패했습니다.",
		error,
	);
}

interface LoginCTAProps extends LanguageType {
	extCid?: string;
	label: string;
}
