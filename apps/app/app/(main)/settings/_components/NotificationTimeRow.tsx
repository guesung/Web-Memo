import { Switch, Text, TouchableOpacity, View } from "react-native";
import type { IFNotificationSchedule } from "@/lib/hooks/useNotificationSchedules";
import { getNotifyTimeParts } from "@/lib/notifications/notifyTime";

/** NotificationTimeRow 컴포넌트 props */
interface IFNotificationTimeRowProps {
	/** 표시할 알림 시각 */
	schedule: IFNotificationSchedule;
	/** 행을 눌러 편집 시트를 열 때 호출 */
	onRowPress: (schedule: IFNotificationSchedule) => void;
	/** 스위치로 켜기/끄기를 바꿀 때 호출 */
	onEnabledChange: (
		schedule: IFNotificationSchedule,
		isEnabled: boolean,
	) => void;
}

/** 알림 시각 한 줄. 시각 표시와 켜기/끄기 스위치를 보여주고, 행을 누르면 편집으로 넘어간다 */
export function NotificationTimeRow({
	schedule,
	onRowPress,
	onEnabledChange,
}: IFNotificationTimeRowProps) {
	const { period, clock } = getNotifyTimeParts(schedule.notifyTime);

	return (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={`${period} ${clock} 알림 수정`}
			className="flex-row items-center justify-between gap-3"
			activeOpacity={0.6}
			onPress={() => onRowPress(schedule)}
		>
			<View className="flex-row items-baseline">
				<Text className="text-[13px] font-medium text-muted-foreground dark:text-neutral-500 mr-1.5">
					{period}
				</Text>
				<Text className="text-[17px] font-semibold text-foreground dark:text-white">
					{clock}
				</Text>
			</View>
			<Switch
				accessibilityLabel={`${period} ${clock} 알림`}
				value={schedule.isEnabled}
				trackColor={{ true: "#2f6bf0" }}
				onValueChange={(isEnabled) => onEnabledChange(schedule, isEnabled)}
			/>
		</TouchableOpacity>
	);
}
