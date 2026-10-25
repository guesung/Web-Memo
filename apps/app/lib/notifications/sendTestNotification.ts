import * as Notifications from "expo-notifications";

export const TEST_NOTIFICATION_TITLE = "테스트 알림";
export const TEST_NOTIFICATION_BODY =
	"알림이 이렇게 도착해요. 실제 알림에는 저장해 둔 글 제목이 보여요.";

/**
 * 알림이 어떻게 도착하는지 보여주는 로컬 알림을 즉시 띄운다.
 * @description data에 url을 넣지 않아 알림을 탭해도 useNotificationObserver가 이동시키지 않는다.
 */
export async function sendTestNotification(): Promise<void> {
	await Notifications.scheduleNotificationAsync({
		content: {
			title: TEST_NOTIFICATION_TITLE,
			body: TEST_NOTIFICATION_BODY,
		},
		trigger: null,
	});
}
