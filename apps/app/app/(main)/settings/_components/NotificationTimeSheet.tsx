import { Check } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IFNotificationSchedule } from "@/lib/hooks/useNotificationSchedules";
import { getNotifyTimeParts } from "@/lib/notifications/notifyTime";

const SHEET_ANIMATION_DISTANCE = 500;
const OPTION_HEIGHT = 44;

/** 30분 단위 시각 목록 (00:00 ~ 23:30) */
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, index) => {
	const hour = String(Math.floor(index / 2)).padStart(2, "0");

	return `${hour}:${index % 2 === 0 ? "00" : "30"}`;
});

const RECOMMENDED_TIMES = [
	{ time: "08:00", label: "오전 8시" },
	{ time: "12:00", label: "점심 12시" },
	{ time: "19:00", label: "저녁 7시" },
];

/** NotificationTimeSheet 컴포넌트 props */
interface IFNotificationTimeSheetProps {
	/** 시트 표시 여부 */
	visible: boolean;
	/** 수정할 알림 시각. null이면 추가 모드 */
	editingSchedule: IFNotificationSchedule | null;
	/** 이미 등록된 시각들 ("HH:MM") — 목록에서 비활성 처리 */
	registeredTimes: string[];
	/** 저장 실패 안내 문구 */
	errorMessage: string | null;
	/** 저장 중 여부 */
	isSaving: boolean;
	/** 시트를 닫을 때 호출 */
	onClose: () => void;
	/** 선택한 시각으로 저장할 때 호출 */
	onSave: (time: string) => void;
	/** 수정 모드에서 삭제할 때 호출 */
	onDelete: () => void;
}

/**
 * 알림 시각을 추가·수정하는 하단 시트.
 * @description 추가 모드는 추천 칩과 30분 단위 목록, 수정 모드는 목록과 삭제 버튼을 보여준다.
 */
export function NotificationTimeSheet({
	visible,
	editingSchedule,
	registeredTimes,
	errorMessage,
	isSaving,
	onClose,
	onSave,
	onDelete,
}: IFNotificationTimeSheetProps) {
	const insets = useSafeAreaInsets();
	const translateY = useSharedValue(SHEET_ANIMATION_DISTANCE);
	const opacity = useSharedValue(0);
	const [isModalVisible, setIsModalVisible] = useState(false);

	useEffect(() => {
		if (visible) {
			setIsModalVisible(true);
			translateY.value = withTiming(0, { duration: 250 });
			opacity.value = withTiming(1, { duration: 250 });
			return;
		}

		translateY.value = withTiming(SHEET_ANIMATION_DISTANCE, { duration: 200 });
		opacity.value = withTiming(0, { duration: 200 });
		const timer = setTimeout(() => setIsModalVisible(false), 210);

		return () => clearTimeout(timer);
	}, [visible, translateY, opacity]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return (
		<Modal
			visible={isModalVisible}
			transparent
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View className="flex-1 justify-end">
				<Animated.View
					className="absolute inset-0 bg-black/40"
					style={overlayStyle}
				>
					<Pressable className="absolute inset-0" onPress={onClose} />
				</Animated.View>

				<Animated.View
					className="bg-white dark:bg-neutral-900 rounded-t-[20px] px-4"
					style={[sheetStyle, { paddingBottom: insets.bottom + 12 }]}
				>
					<View className="items-center py-2.5">
						<View className="w-9 h-1 rounded-sm bg-gray-300 dark:bg-neutral-700" />
					</View>
					<NotificationTimeSheetBody
						editingSchedule={editingSchedule}
						registeredTimes={registeredTimes}
						errorMessage={errorMessage}
						isSaving={isSaving}
						onSave={onSave}
						onDelete={onDelete}
					/>
				</Animated.View>
			</View>
		</Modal>
	);
}

/** 시트가 열려 있는 동안만 마운트되어, 열 때마다 선택값이 초기화된다 */
function NotificationTimeSheetBody({
	editingSchedule,
	registeredTimes,
	errorMessage,
	isSaving,
	onSave,
	onDelete,
}: Pick<
	IFNotificationTimeSheetProps,
	| "editingSchedule"
	| "registeredTimes"
	| "errorMessage"
	| "isSaving"
	| "onSave"
	| "onDelete"
>) {
	const isEditing = editingSchedule !== null;
	const isAvailable = (time: string) => !registeredTimes.includes(time);
	const initialTime =
		editingSchedule?.notifyTime ??
		TIME_OPTIONS.find((time) => time >= "08:00" && isAvailable(time)) ??
		TIME_OPTIONS.find(isAvailable) ??
		null;
	const [selectedTime, setSelectedTime] = useState<string | null>(initialTime);
	const scrollViewRef = useRef<ScrollView>(null);

	const handleListLayout = () => {
		const selectedIndex = TIME_OPTIONS.indexOf(selectedTime ?? "");

		scrollViewRef.current?.scrollTo({
			y: Math.max(selectedIndex - 1, 0) * OPTION_HEIGHT,
			animated: false,
		});
	};

	const isSaveDisabled =
		isSaving ||
		selectedTime === null ||
		selectedTime === editingSchedule?.notifyTime;

	return (
		<View className="gap-3">
			<Text className="text-[17px] font-bold text-foreground dark:text-white">
				{isEditing ? "알림 시간 수정" : "알림 시간 추가"}
			</Text>

			{!isEditing && (
				<View className="flex-row flex-wrap gap-2">
					{RECOMMENDED_TIMES.map(({ time, label }) => {
						const isDisabled = !isAvailable(time);

						return (
							<TouchableOpacity
								key={time}
								accessibilityRole="button"
								disabled={isDisabled}
								className={`rounded-full px-3 py-1.5 ${
									isDisabled
										? "bg-muted dark:bg-neutral-800"
										: "bg-[#eaf0fe] dark:bg-[#1c2740]"
								}`}
								onPress={() => setSelectedTime(time)}
							>
								<Text
									className={`text-[13px] ${
										isDisabled
											? "font-medium text-muted-foreground dark:text-neutral-500"
											: "font-semibold text-[#2f6bf0] dark:text-[#5b93f0]"
									}`}
								>
									{label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			)}

			<View className="rounded-xl border border-muted dark:border-neutral-800 overflow-hidden max-h-[264px]">
				<ScrollView
					ref={scrollViewRef}
					onLayout={handleListLayout}
					showsVerticalScrollIndicator={false}
				>
					{TIME_OPTIONS.map((time) => {
						const { period, clock } = getNotifyTimeParts(time);
						const isCurrentTime = time === editingSchedule?.notifyTime;
						const isDisabled = !isAvailable(time) || isCurrentTime;
						const isSelected = time === selectedTime;
						const disabledNote = isCurrentTime ? "지금 시간" : "이미 추가됨";

						return (
							<TouchableOpacity
								key={time}
								accessibilityRole="button"
								disabled={isDisabled}
								className={`flex-row items-center justify-between px-3.5 border-t border-muted dark:border-neutral-800 ${
									isSelected ? "bg-[#eaf0fe] dark:bg-[#1c2740]" : ""
								}`}
								style={{ height: OPTION_HEIGHT }}
								onPress={() => setSelectedTime(time)}
							>
								<Text
									className={`text-[15px] ${
										isSelected
											? "font-semibold text-[#2f6bf0] dark:text-[#5b93f0]"
											: isDisabled
												? "text-muted-foreground dark:text-neutral-500"
												: "text-foreground dark:text-white"
									}`}
								>
									{period} {clock}
								</Text>
								{isSelected && <Check size={16} color="#2f6bf0" />}
								{isDisabled && (
									<Text className="text-xs text-muted-foreground dark:text-neutral-500">
										{disabledNote}
									</Text>
								)}
							</TouchableOpacity>
						);
					})}
				</ScrollView>
			</View>

			{errorMessage && (
				<Text className="text-[13px] text-destructive dark:text-[#ef6b6b]">
					{errorMessage}
				</Text>
			)}

			<View className="flex-row gap-2">
				{isEditing && (
					<TouchableOpacity
						accessibilityRole="button"
						disabled={isSaving}
						className="items-center justify-center rounded-xl py-3 basis-[34%] bg-muted dark:bg-neutral-800"
						onPress={onDelete}
					>
						<Text className="text-[15px] font-semibold text-destructive dark:text-[#ef6b6b]">
							삭제
						</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					accessibilityRole="button"
					disabled={isSaveDisabled}
					className={`flex-1 items-center rounded-xl py-3 bg-[#2f6bf0] dark:bg-[#5b93f0] ${
						isSaveDisabled ? "opacity-50" : ""
					}`}
					onPress={() => selectedTime && onSave(selectedTime)}
				>
					<Text className="text-[15px] font-semibold text-white dark:text-[#0d0f14]">
						저장
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
