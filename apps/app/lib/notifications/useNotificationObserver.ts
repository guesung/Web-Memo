import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * 알림 탭 응답을 구독해 페이로드의 url로 앱 내 브라우저를 연다.
 * @description 콜드 스타트(앱이 꺼진 상태에서 알림 탭)도 처리한다.
 */
export function useNotificationObserver() {
	const router = useRouter();

	useEffect(() => {
		function openArticle(response: Notifications.NotificationResponse) {
			const url = response.notification.request.content.data?.url;
			if (typeof url !== "string") {
				return;
			}

			router.push({
				pathname: "/(main)/browser",
				params: { url, t: String(Date.now()) },
			});
		}

		Notifications.getLastNotificationResponseAsync().then((response) => {
			if (response) {
				openArticle(response);
			}
		});

		const subscription =
			Notifications.addNotificationResponseReceivedListener(openArticle);

		return () => subscription.remove();
	}, [router]);
}
