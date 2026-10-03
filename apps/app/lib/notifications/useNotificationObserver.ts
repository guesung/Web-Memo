import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * 알림 탭(포그라운드·백그라운드·콜드스타트)을 구독해 payload의 url을 앱 내 브라우저로 연다.
 * @description url이 없으면 무시한다. `t`는 같은 url 재진입에도 브라우저가 반응하도록 하는 nonce다.
 */
export function useNotificationObserver() {
	const router = useRouter();

	useEffect(() => {
		const openArticle = (response: Notifications.NotificationResponse) => {
			const url = response.notification.request.content.data?.url;

			if (typeof url !== "string" || !url) {
				return;
			}

			router.push({
				pathname: "/(main)/browser",
				params: { url, t: String(Date.now()) },
			});
		};

		const openInitialResponse = async () => {
			const response = await Notifications.getLastNotificationResponseAsync();

			if (response) {
				openArticle(response);
			}
		};

		openInitialResponse();

		const subscription =
			Notifications.addNotificationResponseReceivedListener(openArticle);

		return () => subscription.remove();
	}, [router]);
}
