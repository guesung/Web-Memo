import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { setAnalyticsUserId, trackAppEvent } from "./appAnalytics";

/**
 * 화면 전환마다 page_view를 보낸다. 같은 pathname이 연속되면 보내지 않는다.
 * @description 세션 복원이 끝나기 전에 보내면 user_id가 비어 만든 사람 본인의 첫 화면이 걸러지지 않으므로,
 * 인증 로딩이 끝난 뒤부터 보낸다.
 */
export function ScreenViewTracker() {
	const pathname = usePathname();
	const { isLoading: isAuthLoading } = useAuth();
	const lastTrackedPathnameRef = useRef<string | null>(null);

	useEffect(() => {
		if (isAuthLoading) {
			return;
		}
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
	}, [pathname, isAuthLoading]);

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
