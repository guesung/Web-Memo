import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * 알림 탭(포그라운드·백그라운드·콜드스타트)을 구독해 payload의 url을 앱 내 브라우저로 연다.
 * @description url이 없으면 무시한다. `t`는 같은 url 재진입에도 브라우저가 반응하도록 하는 nonce다.
 */
export function useNotificationObserver() {
	const router = useRouter();
	const navigationKey = useRootNavigationState()?.key;
	const lastProcessedResponseRef = useRef<string | null>(null);

	useEffect(() => {
		if (!navigationKey) return;

		let isCancelled = false;
		let hasOpenedLiveResponse = false;

		const openArticle = (response: Notifications.NotificationResponse) => {
			if (isCancelled) return false;
			if (
				response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
			) {
				return false;
			}

			const url = response.notification.request.content.data?.url;

			if (typeof url !== "string" || !url) {
				return false;
			}

			const responseId = `${response.notification.request.identifier}:${response.actionIdentifier}`;
			if (lastProcessedResponseRef.current === responseId) return false;
			lastProcessedResponseRef.current = responseId;

			router.push({
				pathname: "/(main)/browser",
				params: { url: encodeURIComponent(url), t: String(Date.now()) },
			});

			try {
				const latest = Notifications.getLastNotificationResponse();
				if (
					latest?.notification.request.identifier ===
						response.notification.request.identifier &&
					latest.actionIdentifier === response.actionIdentifier
				) {
					Notifications.clearLastNotificationResponse();
				}
			} catch {
				// 마지막 응답 정리가 실패해도 현재 탭 이동은 유지한다.
			}
			return true;
		};

		const openInitialResponse = async () => {
			try {
				const response = await Notifications.getLastNotificationResponseAsync();
				if (!hasOpenedLiveResponse && response) openArticle(response);
			} catch {
				// 알림 응답을 읽지 못해도 리스너는 계속 처리한다.
			}
		};

		void openInitialResponse();

		const subscription = Notifications.addNotificationResponseReceivedListener(
			(response) => {
				if (openArticle(response)) hasOpenedLiveResponse = true;
			},
		);

		return () => {
			isCancelled = true;
			subscription.remove();
		};
	}, [router, navigationKey]);
}
