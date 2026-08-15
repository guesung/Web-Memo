import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

const NOTIFICATION_SETTING_KEY = ["notification-setting"];

/** 매일 아침 아티클 리마인더 알림 설정 */
export interface IFNotificationSetting {
	/** 알림 수신 여부 */
	isEnabled: boolean;
	/** 알림 시각 ("HH:MM") */
	notifyTime: string;
}

/** 알림 설정 기본값 — 옵트인이므로 기본은 Off */
export const DEFAULT_NOTIFICATION_SETTING: IFNotificationSetting = {
	isEnabled: false,
	notifyTime: "08:00",
};

/**
 * "HH:MM:SS" | "HH:MM" → "HH:MM"으로 정규화한다.
 */
function toHourMinute(time: string): string {
	return time.slice(0, 5);
}

/**
 * 알림 설정(On/Off·시각)을 Supabase에서 읽는 훅.
 * @description 행이 없으면 기본값(Off, 08:00)을 돌려준다.
 */
export function useNotificationSetting() {
	const { session } = useAuth();

	const { data, isLoading } = useQuery({
		queryKey: NOTIFICATION_SETTING_KEY,
		enabled: !!session,
		queryFn: async (): Promise<IFNotificationSetting> => {
			const { data: row } = await supabase
				.from("notification_setting")
				.select("isEnabled, notifyTime")
				.maybeSingle();

			if (!row) {
				return DEFAULT_NOTIFICATION_SETTING;
			}

			return {
				isEnabled: row.isEnabled,
				notifyTime: toHourMinute(row.notifyTime),
			};
		},
	});

	return { setting: data ?? DEFAULT_NOTIFICATION_SETTING, isLoading };
}

/**
 * 알림 설정을 저장(upsert)하는 훅.
 * @description 발송 시각 판정에 쓰이도록 기기의 타임존을 함께 저장한다.
 */
export function useNotificationSettingSave() {
	const queryClient = useQueryClient();
	const { session } = useAuth();

	return useMutation({
		mutationFn: async (setting: IFNotificationSetting) => {
			const userId = session?.user.id;
			if (!userId) {
				throw new Error("로그인이 필요합니다.");
			}

			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

			const { error } = await supabase.from("notification_setting").upsert(
				{
					user_id: userId,
					isEnabled: setting.isEnabled,
					notifyTime: setting.notifyTime,
					timezone,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);

			if (error) {
				throw error;
			}
		},
		onMutate: (setting: IFNotificationSetting) => {
			queryClient.setQueryData(NOTIFICATION_SETTING_KEY, setting);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_SETTING_KEY });
		},
	});
}
