import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";

/** Expo 푸시 토큰을 발급받는다. 실기기가 아니거나 발급에 실패하면 null */
async function getExpoPushToken(): Promise<string | null> {
	const projectId = Constants.expoConfig?.extra?.eas?.projectId;

	if (!Device.isDevice || !projectId) {
		return null;
	}

	try {
		const { data: token } = await Notifications.getExpoPushTokenAsync({
			projectId,
		});

		return token;
	} catch {
		return null;
	}
}

/**
 * 알림 권한을 확인하고 없으면 요청한다. Android 채널도 함께 만든다.
 * @description Android 13+는 채널이 있어야 권한 팝업이 뜨므로 요청 전에 채널을 만든다.
 * @returns 권한이 허용돼 있으면 true
 */
export async function requestNotificationPermission(): Promise<boolean> {
	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "읽을 글 알림",
			importance: Notifications.AndroidImportance.DEFAULT,
		});
	}

	const { status: existingStatus } = await Notifications.getPermissionsAsync();

	if (existingStatus === "granted") {
		return true;
	}

	const { status } = await Notifications.requestPermissionsAsync();

	return status === "granted";
}

/**
 * 현재 기기의 Expo 푸시 토큰을 push_token에 upsert한다.
 * @description 실기기가 아니거나 토큰 발급·저장에 실패하면 조용히 넘어간다(다음 저장 때 재시도).
 */
export async function registerPushToken(): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	const userId = sessionData.session?.user.id;
	const token = await getExpoPushToken();

	if (!userId || !token) {
		return;
	}

	await supabase.from("push_token").upsert(
		{
			user_id: userId,
			token,
			platform: Platform.OS,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "token" },
	);
}

/**
 * 현재 기기의 push_token 행을 삭제한다. 로그아웃 직전에 호출한다.
 * @description 실패해도 던지지 않는다 — 로그아웃은 계속 진행돼야 한다.
 */
export async function removePushToken(): Promise<void> {
	try {
		const token = await getExpoPushToken();

		if (!token) {
			return;
		}

		await supabase.from("push_token").delete().eq("token", token);
	} catch {
		// 삭제 실패가 로그아웃을 막지 않는다
	}
}

/**
 * 기기 타임존이 서버에 저장된 값과 다를 때만 notification_setting.timezone을 갱신한다.
 * @description 행이 없으면 timezone만 담아 생성한다(나머지 컬럼은 서버 기본값).
 */
export async function syncNotificationTimezone(): Promise<void> {
	const { data: sessionData } = await supabase.auth.getSession();
	const userId = sessionData.session?.user.id;

	if (!userId) {
		return;
	}

	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const { data: row, error } = await supabase
		.from("notification_setting")
		.select("timezone")
		.eq("user_id", userId)
		.maybeSingle();

	if (error || row?.timezone === timezone) {
		return;
	}

	await supabase.from("notification_setting").upsert(
		{
			user_id: userId,
			timezone,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "user_id" },
	);
}
