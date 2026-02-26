import type { GetMemoResponse } from "@web-memo/shared/types";
import { FileText, Heart, Trash2 } from "lucide-react-native";
import { useRef } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { LocalMemo } from "@/lib/storage/localMemo";

export type MemoItem = LocalMemo | GetMemoResponse;

function formatRelativeDate(dateStr?: string): string {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.floor(
		(today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays === 0) return "오늘";
	if (diffDays === 1) return "어제";
	return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

interface MemoCardProps {
	memo: MemoItem;
	onPress: () => void;
	onDelete: () => void;
}

export function MemoCard({ memo, onPress, onDelete }: MemoCardProps) {
	const swipeableRef = useRef<SwipeableMethods>(null);

	const rawDate =
		"updated_at" in memo
			? (memo as { updated_at?: string }).updated_at
			: "updatedAt" in memo
				? (memo as { updatedAt?: string }).updatedAt
				: undefined;
	const dateLabel = formatRelativeDate(rawDate);

	return (
		<ReanimatedSwipeable
			ref={swipeableRef}
			renderRightActions={(_progress, drag) => (
				<RightAction
					drag={drag}
					onPress={() => {
						swipeableRef.current?.close();
						onDelete();
					}}
				/>
			)}
			overshootRight={false}
			rightThreshold={40}
		>
			<TouchableOpacity
				className="bg-card rounded-xl p-3.5 mb-2.5 border border-muted"
				onPress={onPress}
				activeOpacity={0.7}
			>
				<View className="flex-row items-center gap-1.5 mb-1">
					{memo.favIconUrl ? (
						<Image
							source={{ uri: memo.favIconUrl }}
							style={{ width: 14, height: 14, borderRadius: 2 }}
						/>
					) : (
						<FileText size={14} color="#666" />
					)}
					<Text
						className="flex-1 text-[15px] font-semibold text-foreground"
						numberOfLines={1}
					>
						{memo.title}
					</Text>
					{dateLabel ? (
						<Text className="text-xs text-muted-foreground">{dateLabel}</Text>
					) : null}
					{memo.isWish && <Heart size={12} fill="#ec4899" color="#ec4899" />}
				</View>
				{memo.memo && (
					<Text
						className="text-sm text-secondary-foreground leading-5 mb-1.5"
						numberOfLines={10}
					>
						{memo.memo}
					</Text>
				)}
			</TouchableOpacity>
		</ReanimatedSwipeable>
	);
}

interface RightActionProps {
	drag: SharedValue<number>;
	onPress: () => void;
}

function RightAction({ drag, onPress }: RightActionProps) {
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: interpolate(drag.value, [-80, 0], [1, 0.5], "clamp") },
		],
	}));

	return (
		<TouchableOpacity
			className="bg-destructive rounded-xl justify-center items-center w-[72px] mb-2.5 ml-2"
			onPress={onPress}
			activeOpacity={0.7}
		>
			<Animated.View
				style={[
					{ alignItems: "center", justifyContent: "center", gap: 4 },
					animatedStyle,
				]}
			>
				<Trash2 size={18} color="#fff" />
				<Text className="text-xs text-white font-semibold">삭제</Text>
			</Animated.View>
		</TouchableOpacity>
	);
}
