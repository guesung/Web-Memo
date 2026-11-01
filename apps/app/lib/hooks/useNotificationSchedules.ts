import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

const NOTIFICATION_SCHEDULES_KEY = ["notificationSchedules"];

/** 알림 시각 한 건 */
export interface IFNotificationSchedule {
	id: number;
	/** 알림 시각 ("HH:MM", 30분 단위) */
	notifyTime: string;
	/** 이 시각의 알림 수신 여부 */
	isEnabled: boolean;
}

/**
 * 알림 시각 저장 실패 원인(Postgres 에러코드)에 맞는 사용자 안내 문구를 고른다.
 * @description 23505=같은 시각 중복(UNIQUE), 23514=최대 개수 초과(트리거 check_violation)
 */
export function getNotificationScheduleErrorMessage(error: unknown): string {
	const code =
		typeof error === "object" && error !== null && "code" in error
			? error.code
			: undefined;

	if (code === "23505") {
		return "이미 등록된 시각입니다";
	}

	if (code === "23514") {
		return "최대 5개까지 등록할 수 있어요";
	}

	return "저장하지 못했어요. 잠시 후 다시 시도해 주세요";
}

/** 내 알림 시각 목록을 시각 오름차순으로 조회한다 */
export function useNotificationScheduleQuery() {
	const { isLoggedIn } = useAuth();

	const query = useQuery({
		queryKey: NOTIFICATION_SCHEDULES_KEY,
		enabled: isLoggedIn,
		queryFn: async (): Promise<IFNotificationSchedule[]> => {
			const { data, error } = await supabase
				.from("notification_schedule")
				.select("id, notifyTime, isEnabled")
				.order("notifyTime", { ascending: true });

			if (error) {
				throw error;
			}

			return data.map((row) => ({
				id: row.id,
				notifyTime: row.notifyTime.slice(0, 5),
				isEnabled: row.isEnabled,
			}));
		},
	});

	return { ...query, schedules: query.data ?? [] };
}

/** 알림 시각을 추가한다. 실패 시 Postgres 에러를 그대로 던진다 */
export function useNotificationScheduleAddMutation() {
	const queryClient = useQueryClient();
	const { session } = useAuth();

	return useMutation({
		mutationFn: async (notifyTime: string) => {
			const userId = session?.user.id;

			if (!userId) {
				throw new Error("로그인이 필요합니다.");
			}

			const { error } = await supabase
				.from("notification_schedule")
				.insert({ user_id: userId, notifyTime: `${notifyTime}:00` });

			if (error) {
				throw error;
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_SCHEDULES_KEY });
		},
	});
}

/** 알림 시각의 시각 값을 바꾼다. 실패 시 Postgres 에러를 그대로 던진다 */
export function useNotificationScheduleUpdateMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: { id: number; notifyTime: string }) => {
			const { error } = await supabase
				.from("notification_schedule")
				.update({ notifyTime: `${request.notifyTime}:00` })
				.eq("id", request.id);

			if (error) {
				throw error;
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_SCHEDULES_KEY });
		},
	});
}

/** 알림 시각을 삭제한다 */
export function useNotificationScheduleDeleteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const { error } = await supabase
				.from("notification_schedule")
				.delete()
				.eq("id", id);

			if (error) {
				throw error;
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_SCHEDULES_KEY });
		},
	});
}

/** 알림 시각의 켜기/끄기를 바꾼다. 스위치가 즉시 반응하도록 낙관적으로 갱신한다 */
export function useNotificationScheduleToggleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: { id: number; isEnabled: boolean }) => {
			const { error } = await supabase
				.from("notification_schedule")
				.update({ isEnabled: request.isEnabled })
				.eq("id", request.id);

			if (error) {
				throw error;
			}
		},
		onMutate: (request) => {
			queryClient.setQueryData<IFNotificationSchedule[]>(
				NOTIFICATION_SCHEDULES_KEY,
				(schedules) =>
					schedules?.map((schedule) =>
						schedule.id === request.id
							? { ...schedule, isEnabled: request.isEnabled }
							: schedule,
					),
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATION_SCHEDULES_KEY });
		},
	});
}
