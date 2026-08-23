import type { HighlightGroup } from "@web-memo/shared/modules/highlight";
import type { HighlightRow } from "@web-memo/shared/types";
import { Image, Text, View } from "react-native";
import { HighlightQuote } from "./HighlightQuote";

interface HighlightGroupCardProps {
	group: HighlightGroup;
	/** 이 URL에 저장된 하이라이트 총 개수. 카드에 보이는 문장 수와 다를 수 있다 */
	count: number;
	onHighlightPress: (highlight: HighlightRow) => void;
}

/** 같은 URL에서 그은 하이라이트를 한 카드로 모아 보여준다 */
export function HighlightGroupCard({
	group,
	count,
	onHighlightPress,
}: HighlightGroupCardProps) {
	return (
		<View className="mx-5 mb-3 rounded-xl border border-border dark:border-neutral-800 bg-card dark:bg-neutral-900 p-4">
			<View className="flex-row items-center gap-2 mb-1">
				{group.favIconUrl ? (
					<Image
						source={{ uri: group.favIconUrl }}
						className="w-4 h-4 rounded"
					/>
				) : null}
				<Text
					className="flex-1 text-sm font-semibold text-foreground dark:text-white"
					numberOfLines={1}
				>
					{group.title ?? group.url}
				</Text>
				{count > 0 ? (
					<Text className="text-xs text-muted-foreground dark:text-neutral-500">
						{count}개
					</Text>
				) : null}
			</View>

			{group.highlights.map((highlight) => (
				<HighlightQuote
					key={highlight.id}
					highlight={highlight}
					onPress={onHighlightPress}
				/>
			))}
		</View>
	);
}
