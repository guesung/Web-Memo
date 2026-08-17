import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
	FileText,
	Globe,
	type LucideIcon,
	Settings,
} from "lucide-react-native";
import {
	Platform,
	Text,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowserScroll } from "@/lib/context/BrowserScrollContext";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";

interface TabConfig {
	icon: LucideIcon;
	label: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
	index: { icon: FileText, label: "메모" },
	"browser/index": { icon: Globe, label: "브라우저" },
	"settings/index": { icon: Settings, label: "설정" },
};

interface CustomTabBarProps extends BottomTabBarProps {}

export function CustomTabBar({
	state,
	descriptors,
	navigation,
}: CustomTabBarProps) {
	const insets = useSafeAreaInsets();
	const { tabBarTranslateY, isBrowserActive } = useBrowserScroll();
	const barHeight = useSharedValue(0);
	const { isKeyboardVisible } = useKeyboardHeight();
	const isDark = useColorScheme() === "dark";

	const wrapperStyle = useAnimatedStyle(() => {
		if (isBrowserActive.value !== 1 || barHeight.value === 0) return {};
		const visibleHeight = Math.max(0, barHeight.value - tabBarTranslateY.value);
		return {
			height: visibleHeight,
			overflow: "hidden" as const,
		};
	});

	// Android는 키보드가 창을 밀어내지 않아 탭바가 키보드에 가려진 채로 공간만 차지한다.
	// 화면 아래 공간을 그대로 키보드에 내주어야 위쪽 콘텐츠가 정확히 키보드 위에 놓인다.
	if (Platform.OS === "android" && isKeyboardVisible) {
		return null;
	}

	const focusedIconColor = isDark ? "#fff" : "#111";
	const unfocusedIconColor = isDark ? "#737373" : "#999";

	return (
		<Animated.View style={wrapperStyle}>
			<View
				className="flex-row bg-white dark:bg-neutral-900 border-t border-border dark:border-neutral-800 pt-2"
				style={{ paddingBottom: insets.bottom }}
				onLayout={(e) => {
					if (barHeight.value === 0) {
						barHeight.value = e.nativeEvent.layout.height;
					}
				}}
			>
				{state.routes.map((route, index) => {
					const config = TAB_CONFIG[route.name];
					if (!config) return null;

					const { options } = descriptors[route.key];
					const isFocused = state.index === index;

					const Icon = config.icon;

					const onPress = () => {
						if (isFocused) return;

						navigation.navigate(route.name, route.params);
					};

					return (
						<TouchableOpacity
							key={route.key}
							accessibilityRole="button"
							accessibilityState={isFocused ? { selected: true } : {}}
							accessibilityLabel={options.tabBarAccessibilityLabel}
							onPress={onPress}
							className="flex-1 items-center justify-center py-1 gap-0.5"
							activeOpacity={0.7}
						>
							<Icon
								size={22}
								color={isFocused ? focusedIconColor : unfocusedIconColor}
							/>
							<Text
								className={`text-[11px] mt-0.5 ${isFocused ? "text-foreground dark:text-white font-semibold" : "text-muted-foreground dark:text-neutral-500"}`}
							>
								{config.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</Animated.View>
	);
}
