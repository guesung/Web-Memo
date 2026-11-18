import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { MoreHorizontal } from "lucide-react-native";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { confirmHighlightDelete } from "@/lib/confirmHighlightDelete";

interface HighlightQuoteProps {
	highlight: HighlightRow;
	onPress: (highlight: HighlightRow) => void;
	onDelete: (highlight: HighlightRow) => void;
	isDeleting: boolean;
}

/** URL별 그룹 카드 안의 하이라이트 한 문장. 색 막대 + 문장 + 메모를 보여준다 */
export function HighlightQuote({
	highlight,
	onPress,
	onDelete,
	isDeleting,
}: HighlightQuoteProps) {
	const isDark = useColorScheme() === "dark";
	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	return (
		<TouchableOpacity
			className="flex-row gap-3 py-2.5"
			onPress={() => onPress(highlight)}
			activeOpacity={0.7}
			style={{ opacity: isDeleting ? 0.4 : 1 }}
		>
			<View
				className="w-1 rounded-full"
				style={{ backgroundColor: style.bar }}
			/>
			<View className="flex-1">
				<Text className="text-sm leading-6 text-foreground dark:text-white">
					{highlight.exact_text}
				</Text>
				{highlight.note ? (
					<Text className="mt-1 text-xs text-muted-foreground dark:text-neutral-400">
						{highlight.note}
					</Text>
				) : null}
			</View>
			<TouchableOpacity
				className="self-start p-1"
				onPress={() => confirmHighlightDelete(() => onDelete(highlight))}
				disabled={isDeleting}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				accessibilityLabel="하이라이트 더보기"
			>
				<MoreHorizontal size={16} color={isDark ? "#a3a3a3" : "#737373"} />
			</TouchableOpacity>
		</TouchableOpacity>
	);
}
