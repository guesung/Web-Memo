import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { setAnalyticsUserId, trackAppEvent } from "./appAnalytics";

/** 화면 전환마다 page_view를 보낸다. 같은 pathname이 연속되면 보내지 않는다. */
export function ScreenViewTracker() {
	const pathname = usePathname();
	const lastTrackedPathnameRef = useRef<string | null>(null);

	useEffect(() => {
		if (lastTrackedPathnameRef.current === pathname) {
			return;
		}
		lastTrackedPathnameRef.current = pathname;

		trackAppEvent({
			name: "page_view",
			params: {
				page_title: pathname,
				page_location: `webmemo://app${pathname}`,
			},
		});
	}, [pathname]);

	return null;
}

/** 로그인 사용자 id를 GA 전송 모듈에 연결한다. */
export function AnalyticsUserSync() {
	const { session } = useAuth();
	const userId = session?.user.id;

	useEffect(() => {
		setAnalyticsUserId(userId);
	}, [userId]);

	return null;
}
