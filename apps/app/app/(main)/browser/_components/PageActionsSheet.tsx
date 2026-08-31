import {
	Bookmark,
	BookOpen,
	Heart,
	Share2,
	Sparkles,
	Star,
	TextCursorInput,
	X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHEET_ANIMATION_DISTANCE = 400;

interface ActionRowProps {
	icon: React.ReactNode;
	label: string;
	onPress: () => void;
}

function ActionRow({ icon, label, onPress }: ActionRowProps) {
	return (
		<TouchableOpacity
			className="flex-row items-center gap-3 px-5 py-3.5"
			onPress={onPress}
			activeOpacity={0.6}
		>
			{icon}
			<Text className="text-[15px] text-foreground dark:text-white">
				{label}
			</Text>
		</TouchableOpacity>
	);
}

interface PageActionsSheetProps {
	visible: boolean;
	onClose: () => void;
	isCurrentPageFavorite: boolean;
	isCurrentPageReading: boolean;
	isCurrentPageWish: boolean;
	isCurrentPageStar: boolean;
	/** 현재 도메인의 드래그 잠금이 풀려 있는지 */
	isSelectionUnlocked: boolean;
	onFavoriteToggle: () => void;
	onReadingToggle: () => void;
	onWishToggle: () => void;
	onStarToggle: () => void;
	onShare: () => void;
	onOpenAI: () => void;
	onSelectionUnlockToggle: () => void;
}

/** 브라우저 헤더의 여러 상태 토글 버튼(즐겨찾기/읽는 중/위시/중요/공유/AI)을 하나의 버튼으로 모은 액션 시트 */
export function PageActionsSheet({
	visible,
	onClose,
	isCurrentPageFavorite,
	isCurrentPageReading,
	isCurrentPageWish,
	isCurrentPageStar,
	isSelectionUnlocked,
	onFavoriteToggle,
	onReadingToggle,
	onWishToggle,
	onStarToggle,
	onShare,
	onOpenAI,
	onSelectionUnlockToggle,
}: PageActionsSheetProps) {
	const insets = useSafeAreaInsets();
	const isDark = useColorScheme() === "dark";
	const translateY = useSharedValue(SHEET_ANIMATION_DISTANCE);
	const opacity = useSharedValue(0);
	const [modalVisible, setModalVisible] = useState(false);

	useEffect(() => {
		if (visible) {
			setModalVisible(true);
			translateY.value = withTiming(0, { duration: 250 });
			opacity.value = withTiming(1, { duration: 250 });
		} else {
			translateY.value = withTiming(SHEET_ANIMATION_DISTANCE, {
				duration: 200,
			});
			opacity.value = withTiming(0, { duration: 200 });
			const timer = setTimeout(() => setModalVisible(false), 210);
			return () => clearTimeout(timer);
		}
	}, [visible, translateY, opacity]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const withClose = (action: () => void) => () => {
		action();
		onClose();
	};

	return (
		<Modal visible={modalVisible} transparent statusBarTranslucent>
			<View className="flex-1 justify-end">
				<Animated.View
					className="absolute inset-0 bg-black/40"
					style={overlayStyle}
				>
					<Pressable className="absolute inset-0" onPress={onClose} />
				</Animated.View>

				<Animated.View
					className="bg-white dark:bg-neutral-900 rounded-t-[20px]"
					style={[sheetStyle, { paddingBottom: insets.bottom + 8 }]}
				>
					<View className="items-center py-2.5">
						<View className="w-9 h-1 rounded-sm bg-gray-300 dark:bg-neutral-700" />
					</View>

					<View className="flex-row justify-between items-center px-5 pb-2">
						<Text className="text-lg font-bold text-foreground dark:text-white">
							페이지 액션
						</Text>
						<TouchableOpacity onPress={onClose} activeOpacity={0.7}>
							<X size={22} color={isDark ? "#aaa" : "#666"} />
						</TouchableOpacity>
					</View>

					<ActionRow
						icon={
							<Bookmark
								size={20}
								color={
									isCurrentPageFavorite ? "#f59e0b" : isDark ? "#aaa" : "#666"
								}
								fill={isCurrentPageFavorite ? "#f59e0b" : "none"}
							/>
						}
						label={isCurrentPageFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
						onPress={withClose(onFavoriteToggle)}
					/>
					<ActionRow
						icon={
							<BookOpen
								size={20}
								color={
									isCurrentPageReading ? "#10b981" : isDark ? "#aaa" : "#666"
								}
							/>
						}
						label={isCurrentPageReading ? "읽는 중 해제" : "읽는 중으로 표시"}
						onPress={withClose(onReadingToggle)}
					/>
					<ActionRow
						icon={
							<Heart
								size={20}
								color={isCurrentPageWish ? "#ec4899" : isDark ? "#aaa" : "#666"}
								fill={isCurrentPageWish ? "#ec4899" : "none"}
							/>
						}
						label={isCurrentPageWish ? "위시리스트 해제" : "위시리스트에 추가"}
						onPress={withClose(onWishToggle)}
					/>
					<ActionRow
						icon={
							<Star
								size={20}
								color={isCurrentPageStar ? "#f59e0b" : isDark ? "#aaa" : "#666"}
								fill={isCurrentPageStar ? "#f59e0b" : "none"}
							/>
						}
						label={isCurrentPageStar ? "중요 해제" : "중요 표시"}
						onPress={withClose(onStarToggle)}
					/>
					<ActionRow
						icon={<Share2 size={20} color={isDark ? "#aaa" : "#666"} />}
						label="공유"
						onPress={withClose(onShare)}
					/>
					<ActionRow
						icon={<Sparkles size={20} color="#7c3aed" />}
						label="AI 요약/질문하기"
						onPress={withClose(onOpenAI)}
					/>
					<ActionRow
						icon={
							<TextCursorInput
								size={20}
								color={
									isSelectionUnlocked ? "#10b981" : isDark ? "#aaa" : "#666"
								}
							/>
						}
						label={
							isSelectionUnlocked ? "드래그 잠금 다시 걸기" : "드래그 잠금 해제"
						}
						onPress={withClose(onSelectionUnlockToggle)}
					/>
				</Animated.View>
			</View>
		</Modal>
	);
}
