import { useState } from "react";
import {
	FlatList,
	Modal,
	Pressable,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

const TIME_OPTION_HEIGHT = 48;

const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, index) => {
	const hour = String(Math.floor(index / 2)).padStart(2, "0");
	const minute = index % 2 === 0 ? "00" : "30";

	return `${hour}:${minute}`;
});

/** NotificationTimePicker 컴포넌트 props */
interface IFNotificationTimePickerProps {
	/** 현재 선택된 시각 ("HH:MM") */
	value: string;
	/** 시각을 선택했을 때 호출되는 콜백 */
	onTimeChange: (time: string) => void;
}

/**
 * 알림 시각을 30분 단위로 고르는 피커.
 * @description 현재 값을 누르면 모달 목록이 열리고, 선택 시 onTimeChange를 호출한다.
 */
export function NotificationTimePicker({
	value,
	onTimeChange,
}: IFNotificationTimePickerProps) {
	const [isPickerOpen, setIsPickerOpen] = useState(false);

	const handleTimeSelect = (time: string) => {
		onTimeChange(time);
		setIsPickerOpen(false);
	};

	const selectedIndex = TIME_OPTIONS.indexOf(value);

	return (
		<>
			<TouchableOpacity
				className="px-3 py-1.5 rounded-lg bg-muted"
				onPress={() => setIsPickerOpen(true)}
			>
				<Text className="text-[15px] font-semibold text-foreground">
					{value}
				</Text>
			</TouchableOpacity>

			<Modal
				visible={isPickerOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsPickerOpen(false)}
			>
				<Pressable
					className="flex-1 bg-black/40 justify-center px-10"
					onPress={() => setIsPickerOpen(false)}
				>
					<View className="bg-white rounded-2xl max-h-[60%] overflow-hidden">
						<FlatList
							data={TIME_OPTIONS}
							keyExtractor={(item) => item}
							initialScrollIndex={selectedIndex === -1 ? 0 : selectedIndex}
							getItemLayout={(_, index) => ({
								length: TIME_OPTION_HEIGHT,
								offset: TIME_OPTION_HEIGHT * index,
								index,
							})}
							renderItem={({ item }) => (
								<TouchableOpacity
									className={`h-12 justify-center items-center ${
										item === value ? "bg-muted" : ""
									}`}
									onPress={() => handleTimeSelect(item)}
								>
									<Text
										className={`text-base ${
											item === value
												? "font-bold text-foreground"
												: "text-secondary-foreground"
										}`}
									>
										{item}
									</Text>
								</TouchableOpacity>
							)}
						/>
					</View>
				</Pressable>
			</Modal>
		</>
	);
}
