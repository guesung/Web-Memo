import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
	type HighlightColor,
} from "@web-memo/shared/constants";
import { Search, X } from "lucide-react-native";
import {
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";

interface HighlightFilterBarProps {
	searchInput: string;
	selectedColor?: HighlightColor;
	onSearchInputChange: (value: string) => void;
	onColorChange: (color?: HighlightColor) => void;
}

/** 하이라이트 목록 상단의 검색창과 색상 칩 */
export function HighlightFilterBar({
	searchInput,
	selectedColor,
	onSearchInputChange,
	onColorChange,
}: HighlightFilterBarProps) {
	const isDark = useColorScheme() === "dark";
	const iconColor = isDark ? "#a3a3a3" : "#999";

	return (
		<View className="mb-4">
			<View className="flex-row items-center gap-2 mx-5 mb-3 px-3 h-11 rounded-xl bg-muted dark:bg-neutral-800">
				<Search size={16} color={iconColor} />
				<TextInput
					className="flex-1 text-sm text-foreground dark:text-white"
					value={searchInput}
					onChangeText={onSearchInputChange}
					placeholder="문장이나 메모로 검색"
					placeholderTextColor={iconColor}
					returnKeyType="search"
					autoCorrect={false}
				/>
				{searchInput.length > 0 ? (
					<TouchableOpacity onPress={() => onSearchInputChange("")} hitSlop={8}>
						<X size={16} color={iconColor} />
					</TouchableOpacity>
				) : null}
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerClassName="px-5 gap-2"
			>
				<ColorChip
					label="전체"
					isSelected={selectedColor === undefined}
					onPress={() => onColorChange(undefined)}
				/>
				{HIGHLIGHT_COLORS.map((color) => (
					<ColorChip
						key={color}
						label={color}
						dotColor={HIGHLIGHT_COLOR_STYLE[color].bar}
						isSelected={selectedColor === color}
						onPress={() => onColorChange(color)}
					/>
				))}
			</ScrollView>
		</View>
	);
}

interface ColorChipProps {
	label: string;
	dotColor?: string;
	isSelected: boolean;
	onPress: () => void;
}

function ColorChip({ label, dotColor, isSelected, onPress }: ColorChipProps) {
	return (
		<TouchableOpacity
			className={`flex-row items-center gap-1.5 px-3.5 py-[7px] rounded-[20px] ${isSelected ? "bg-foreground dark:bg-neutral-700" : "bg-muted dark:bg-neutral-800"}`}
			onPress={onPress}
		>
			{dotColor ? (
				<View
					className="w-3 h-3 rounded-full"
					style={{ backgroundColor: dotColor }}
				/>
			) : null}
			<Text
				className={`text-[13px] font-semibold ${isSelected ? "text-white" : "text-gray-500 dark:text-neutral-400"}`}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);
}
