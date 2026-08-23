import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { Text, TouchableOpacity, View } from "react-native";

interface HighlightQuoteProps {
	highlight: HighlightRow;
	onPress: (highlight: HighlightRow) => void;
}

/** URL별 그룹 카드 안의 하이라이트 한 문장. 색 막대 + 문장 + 메모를 보여준다 */
export function HighlightQuote({ highlight, onPress }: HighlightQuoteProps) {
	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	return (
		<TouchableOpacity
			className="flex-row gap-3 py-2.5"
			onPress={() => onPress(highlight)}
			activeOpacity={0.7}
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
		</TouchableOpacity>
	);
}
