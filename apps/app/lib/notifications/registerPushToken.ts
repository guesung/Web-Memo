import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";

/**
 * 푸시 알림 권한을 요청하고 Expo 푸시 토큰을 발급받아 Supabase에 upsert한다.
 * @returns 토큰 등록까지 성공하면 true, 권한 거부·시뮬레이터·미로그인 등은 false
 */
export async function registerPushToken(): Promise<boolean> {
	if (!Device.isDevice) return false;

	const { data: sessionData } = await supabase.auth.getSession();
	const userId = sessionData.session?.user.id;
	if (!userId) return false;

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}
	if (finalStatus !== "granted") return false;

	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "기본",
			importance: Notifications.AndroidImportance.DEFAULT,
		});
	}

	const projectId = Constants.expoConfig?.extra?.eas?.projectId;
	if (!projectId) return false;

	try {
		const { data: token } = await Notifications.getExpoPushTokenAsync({
			projectId,
		});

		const { error } = await supabase.from("push_token").upsert(
			{
				user_id: userId,
				token,
				platform: Platform.OS,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "token" },
		);

		return !error;
	} catch {
		// 토큰 발급 실패는 조용히 무시 — 다음 앱 시작 시 재시도
		return false;
	}
}
