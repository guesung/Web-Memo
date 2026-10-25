import { Text, TouchableOpacity, useColorScheme, View } from "react-native";

interface TabCountButtonProps {
	/** 열린 탭 수. 99를 넘으면 99로 표시한다 */
	count: number;
	onPress: () => void;
}

/** 열린 탭 수를 둥근 사각 테두리 안에 보여주는 버튼. 누르면 탭 목록 시트를 연다 */
export function TabCountButton({ count, onPress }: TabCountButtonProps) {
	const isDark = useColorScheme() === "dark";
	const color = isDark ? "#eee" : "#111";

	return (
		<TouchableOpacity onPress={onPress} className="p-1.5">
			<View
				className="items-center justify-center rounded-[5px]"
				style={{ width: 17, height: 17, borderWidth: 1.8, borderColor: color }}
			>
				<Text
					className="font-bold"
					style={{ fontSize: 10, lineHeight: 12, color }}
				>
					{Math.min(count, 99)}
				</Text>
			</View>
		</TouchableOpacity>
	);
}
