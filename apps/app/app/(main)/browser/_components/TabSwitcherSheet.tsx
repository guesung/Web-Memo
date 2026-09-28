import { Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	useColorScheme,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IFBrowserTab } from "@/lib/storage/browserTabs";

const SHEET_ANIMATION_DISTANCE = 600;

interface TabSwitcherSheetProps {
	visible: boolean;
	onClose: () => void;
	tabs: IFBrowserTab[];
	activeTabId: string;
	onSelectTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onNewTab: () => void;
}

/** 열린 탭 목록을 보여주고 전환·닫기·새 탭 추가를 하는 하단 시트 */
export function TabSwitcherSheet({
	visible,
	onClose,
	tabs,
	activeTabId,
	onSelectTab,
	onCloseTab,
	onNewTab,
}: TabSwitcherSheetProps) {
	const insets = useSafeAreaInsets();
	const isDark = useColorScheme() === "dark";
	const { height: windowHeight } = useWindowDimensions();
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

	return (
		<Modal
			visible={modalVisible}
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
					className="bg-white dark:bg-neutral-900 rounded-t-[20px]"
					style={[sheetStyle, { paddingBottom: insets.bottom + 8 }]}
				>
					<View className="items-center py-2.5">
						<View className="w-9 h-1 rounded-sm bg-gray-300 dark:bg-neutral-700" />
					</View>

					<View className="flex-row justify-between items-center px-5 pb-2">
						<Text className="text-lg font-bold text-foreground dark:text-white">
							열린 탭
						</Text>
						<Text className="text-[13px] text-gray-500 dark:text-neutral-400">
							{tabs.length}개
						</Text>
					</View>

					<ScrollView
						style={{ maxHeight: windowHeight * 0.7 }}
						keyboardShouldPersistTaps="handled"
					>
						{tabs.map((tab) => (
							<TabRow
								key={tab.id}
								tab={tab}
								isActive={tab.id === activeTabId}
								isDark={isDark}
								onSelect={() => onSelectTab(tab.id)}
								onClose={() => onCloseTab(tab.id)}
							/>
						))}
					</ScrollView>

					<TouchableOpacity
						className="flex-row items-center justify-center gap-1.5 mx-5 mt-3 py-3 rounded-xl border border-border dark:border-neutral-700"
						onPress={onNewTab}
						activeOpacity={0.7}
					>
						<Plus size={16} color={isDark ? "#eee" : "#111"} />
						<Text className="text-[15px] font-semibold text-foreground dark:text-white">
							새 탭
						</Text>
					</TouchableOpacity>
				</Animated.View>
			</View>
		</Modal>
	);
}

interface TabRowProps {
	tab: IFBrowserTab;
	isActive: boolean;
	isDark: boolean;
	onSelect: () => void;
	onClose: () => void;
}

function TabRow({ tab, isActive, isDark, onSelect, onClose }: TabRowProps) {
	const isNewTab = tab.url === "";
	const domain = getDomain(tab.url);
	const activeColor = isDark ? "#60a5fa" : "#3b82f6";

	let rowBackgroundColor = "transparent";
	if (isActive) {
		rowBackgroundColor = isDark ? "#1e293b" : "#eef4ff";
	}

	return (
		<View
			className="flex-row items-center"
			style={{
				backgroundColor: rowBackgroundColor,
				borderLeftWidth: 3,
				borderLeftColor: isActive ? activeColor : "transparent",
			}}
		>
			<TouchableOpacity
				className="flex-1 flex-row items-center gap-3 pl-4 py-3"
				onPress={onSelect}
				activeOpacity={0.6}
			>
				<View className="w-7 h-7 rounded-lg bg-input dark:bg-neutral-800 items-center justify-center">
					<Text className="text-[13px] font-bold text-gray-600 dark:text-neutral-300">
						{isNewTab ? "+" : domain.charAt(0).toUpperCase()}
					</Text>
				</View>
				<View className="flex-1">
					<Text
						className="text-[15px] text-foreground dark:text-white"
						numberOfLines={1}
					>
						{isNewTab ? "새 탭" : tab.title || domain}
					</Text>
					<Text
						className="text-xs text-gray-500 dark:text-neutral-400"
						numberOfLines={1}
					>
						{isNewTab ? "빈 페이지" : domain}
					</Text>
				</View>
			</TouchableOpacity>
			<TouchableOpacity
				className="px-4 py-3"
				onPress={onClose}
				activeOpacity={0.6}
				hitSlop={4}
			>
				<X size={18} color={isDark ? "#a3a3a3" : "#9ca3af"} />
			</TouchableOpacity>
		</View>
	);
}

/** 표시용 도메인(www 제외). 파싱할 수 없으면 원문 */
function getDomain(url: string): string {
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}
