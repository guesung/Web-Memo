import * as Notifications from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { recordEntryTrace, reportEntryError } from "../monitoring/entryTrace";

/**
 * 알림 탭(포그라운드·백그라운드·콜드스타트)을 구독해 payload의 url을 앱 내 브라우저로 연다.
 * @description url이 없으면 무시한다. `t`는 같은 url 재진입에도 브라우저가 반응하도록 하는 nonce다.
 */
export function useNotificationObserver() {
	const router = useRouter();
	const navigationKey = useRootNavigationState()?.key;
	const lastProcessedResponseRef = useRef<string | null>(null);

	useEffect(() => {
		if (!navigationKey) {
			recordEntryTrace({
				source: "notification",
				stage: "navigation_not_ready",
			});
			return;
		}
		recordEntryTrace({ source: "notification", stage: "navigation_ready" });

		let isCancelled = false;
		let hasOpenedLiveResponse = false;

		const openArticle = (
			response: Notifications.NotificationResponse,
			origin: "initial" | "live",
		) => {
			if (isCancelled) {
				recordEntryTrace({
					source: "notification",
					stage: "ignored_cancelled",
				});
				return false;
			}
			if (
				response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
			) {
				recordEntryTrace({ source: "notification", stage: "ignored_action" });
				return false;
			}

			const url = response.notification.request.content.data?.url;

			if (typeof url !== "string" || !url) {
				recordEntryTrace({ source: "notification", stage: "ignored_url" });
				return false;
			}

			const responseId = `${response.notification.request.identifier}:${response.actionIdentifier}`;
			if (lastProcessedResponseRef.current === responseId) {
				recordEntryTrace({
					source: "notification",
					stage: "ignored_duplicate",
					url,
				});
				return false;
			}
			lastProcessedResponseRef.current = responseId;

			recordEntryTrace({
				source: "notification",
				stage:
					origin === "initial"
						? "initial_navigation_before"
						: "live_navigation_before",
				url,
			});
			try {
				router.push({
					pathname: "/(main)/browser",
					params: { url: encodeURIComponent(url), t: String(Date.now()) },
				});
			} catch (error) {
				reportEntryError(error, {
					source: "notification",
					stage: "navigation_failed",
					url,
				});
				throw error;
			}
			recordEntryTrace({
				source: "notification",
				stage: "navigation_after",
				url,
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
			} catch (error) {
				reportEntryError(error, {
					source: "notification",
					stage: "clear_failed",
					url,
				});
				// 마지막 응답 정리가 실패해도 현재 탭 이동은 유지한다.
			}
			return true;
		};

		const openInitialResponse = async () => {
			recordEntryTrace({
				source: "notification",
				stage: "initial_read_before",
			});
			let response: Notifications.NotificationResponse | null;
			try {
				response = await Notifications.getLastNotificationResponseAsync();
			} catch (error) {
				reportEntryError(error, {
					source: "notification",
					stage: "initial_read_failed",
				});
				// 알림 응답을 읽지 못해도 리스너는 계속 처리한다.
				return;
			}
			recordEntryTrace({
				source: "notification",
				stage: "initial_read_after",
				data: { hasResponse: Boolean(response) },
			});
			if (hasOpenedLiveResponse) {
				recordEntryTrace({
					source: "notification",
					stage: "initial_ignored_after_live",
				});
				return;
			}
			if (response) {
				try {
					openArticle(response, "initial");
				} catch {
					// openArticle이 이미 원래 오류를 보고했다.
				}
			}
		};

		void openInitialResponse();

		const subscription = Notifications.addNotificationResponseReceivedListener(
			(response) => {
				recordEntryTrace({ source: "notification", stage: "live_received" });
				if (openArticle(response, "live")) hasOpenedLiveResponse = true;
			},
		);

		return () => {
			recordEntryTrace({ source: "notification", stage: "cleanup" });
			isCancelled = true;
			subscription.remove();
		};
	}, [router, navigationKey]);
}
