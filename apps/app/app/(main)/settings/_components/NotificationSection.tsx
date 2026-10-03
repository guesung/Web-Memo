import { Plus } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import {
	getNotificationScheduleErrorMessage,
	type IFNotificationSchedule,
	useNotificationScheduleAddMutation,
	useNotificationScheduleDeleteMutation,
	useNotificationScheduleQuery,
	useNotificationScheduleToggleMutation,
	useNotificationScheduleUpdateMutation,
} from "@/lib/hooks/useNotificationSchedules";
import {
	registerPushToken,
	requestNotificationPermission,
} from "@/lib/notifications/registerPushToken";
import { NotificationTimeRow } from "./NotificationTimeRow";
import { NotificationTimeSheet } from "./NotificationTimeSheet";

const MAX_SCHEDULE_COUNT = 5;

/**
 * 설정 화면의 "알림" 섹션. 알림 시각 목록을 보여주고 추가·수정·삭제·on/off를 다룬다.
 * @description 첫 시각을 저장할 때 알림 권한을 요청하고, 거부되면 저장하지 않는다.
 */
export function NotificationSection() {
	const { schedules, isLoading, isError, refetch } =
		useNotificationScheduleQuery();
	const { mutateAsync: addSchedule, isPending: isAdding } =
		useNotificationScheduleAddMutation();
	const { mutateAsync: updateSchedule, isPending: isUpdating } =
		useNotificationScheduleUpdateMutation();
	const { mutateAsync: deleteSchedule, isPending: isDeleting } =
		useNotificationScheduleDeleteMutation();
	const { mutate: toggleSchedule } = useNotificationScheduleToggleMutation();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingSchedule, setEditingSchedule] =
		useState<IFNotificationSchedule | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const isFull = schedules.length >= MAX_SCHEDULE_COUNT;

	const handleAddPress = () => {
		setEditingSchedule(null);
		setErrorMessage(null);
		setIsSheetOpen(true);
	};

	const handleRowPress = (schedule: IFNotificationSchedule) => {
		setEditingSchedule(schedule);
		setErrorMessage(null);
		setIsSheetOpen(true);
	};

	const handleSheetClose = () => {
		setIsSheetOpen(false);
	};

	const handleEnabledChange = (
		schedule: IFNotificationSchedule,
		isEnabled: boolean,
	) => {
		toggleSchedule({ id: schedule.id, isEnabled });
	};

	const handleSave = async (time: string) => {
		setErrorMessage(null);

		try {
			if (editingSchedule) {
				await updateSchedule({ id: editingSchedule.id, notifyTime: time });
				setIsSheetOpen(false);
				return;
			}

			const isFirstSchedule = schedules.length === 0;

			if (isFirstSchedule && !(await requestNotificationPermission())) {
				setIsSheetOpen(false);
				showPermissionDeniedAlert();
				return;
			}

			await addSchedule(time);

			if (isFirstSchedule) {
				await registerPushToken();
			}

			setIsSheetOpen(false);
		} catch (error) {
			setErrorMessage(getNotificationScheduleErrorMessage(error));
		}
	};

	const handleDelete = async () => {
		if (!editingSchedule) {
			return;
		}

		try {
			await deleteSchedule(editingSchedule.id);
			setIsSheetOpen(false);
		} catch (error) {
			setErrorMessage(getNotificationScheduleErrorMessage(error));
		}
	};

	return (
		<View className="mb-7">
			<Text className="text-sm font-semibold text-muted-foreground dark:text-neutral-500 uppercase tracking-wide mb-2.5">
				알림
			</Text>
			<View className="bg-card dark:bg-neutral-900 rounded-[14px] p-4 border border-muted dark:border-neutral-800 gap-4">
				{isLoading && <NotificationLoadingRows />}

				{isError && (
					<>
						<Text className="text-sm text-foreground dark:text-white">
							알림 설정을 불러오지 못했어요
						</Text>
						<TouchableOpacity
							accessibilityRole="button"
							className="self-start"
							onPress={() => refetch()}
						>
							<Text className="text-sm font-semibold text-[#2f6bf0] dark:text-[#5b93f0]">
								다시 시도
							</Text>
						</TouchableOpacity>
					</>
				)}

				{!isLoading && !isError && (
					<>
						{schedules.length === 0 && (
							<Text className="text-[15px] leading-6 text-center text-foreground dark:text-white">
								알림 시간을 추가하면 저장해 둔 글을 그 시간에 보내드려요
							</Text>
						)}
						{schedules.map((schedule) => (
							<NotificationTimeRow
								key={schedule.id}
								schedule={schedule}
								onRowPress={handleRowPress}
								onEnabledChange={handleEnabledChange}
							/>
						))}
						<TouchableOpacity
							accessibilityRole="button"
							disabled={isFull}
							className={`flex-row items-center gap-2 pt-3.5 border-t border-muted dark:border-neutral-800 ${
								isFull ? "opacity-60" : ""
							}`}
							onPress={handleAddPress}
						>
							<View
								className={`w-5 h-5 rounded-full items-center justify-center ${
									isFull
										? "bg-gray-300 dark:bg-neutral-700"
										: "bg-[#2f6bf0] dark:bg-[#5b93f0]"
								}`}
							>
								<Plus size={14} color="#fff" />
							</View>
							<Text
								className={`text-[15px] font-semibold ${
									isFull
										? "text-muted-foreground dark:text-neutral-500"
										: "text-[#2f6bf0] dark:text-[#5b93f0]"
								}`}
							>
								시간 추가
							</Text>
						</TouchableOpacity>
					</>
				)}
			</View>

			{!isLoading && !isError && schedules.length > 0 && (
				<Text className="text-[13px] leading-5 text-muted-foreground dark:text-neutral-500 mt-2.5 px-1">
					{isFull
						? "알림 시간은 최대 5개까지 추가할 수 있어요."
						: "저장해 둔 글 중에서 시간마다 1건을 골라 보내요. 보낼 글이 없으면 알림도 없어요. 시간은 지금 기기의 시간대 기준이고, 30분 단위로 정할 수 있어요."}
				</Text>
			)}

			<NotificationTimeSheet
				visible={isSheetOpen}
				editingSchedule={editingSchedule}
				registeredTimes={schedules.map((schedule) => schedule.notifyTime)}
				errorMessage={errorMessage}
				isSaving={isAdding || isUpdating || isDeleting}
				onClose={handleSheetClose}
				onSave={handleSave}
				onDelete={handleDelete}
			/>
		</View>
	);
}

/** 불러오는 중 자리표시자. 회색 막대 3줄과 비활성 스위치 */
function NotificationLoadingRows() {
	return (
		<>
			{[0, 1, 2].map((index) => (
				<View key={index} className="flex-row items-center justify-between">
					<View className="h-3 w-[46%] rounded-md bg-gray-200 dark:bg-neutral-800" />
					<View className="w-[46px] h-7 rounded-full bg-gray-200 dark:bg-neutral-800 opacity-45" />
				</View>
			))}
		</>
	);
}

/** 알림 권한이 거부됐을 때 기기 설정으로 안내한다 */
function showPermissionDeniedAlert() {
	Alert.alert("알림이 꺼져 있어요", "기기 설정에서 웹 메모 알림을 켜 주세요.", [
		{ text: "취소", style: "cancel" },
		{ text: "설정 열기", onPress: () => Linking.openSettings() },
	]);
}
