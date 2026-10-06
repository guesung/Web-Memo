import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
	FileText,
	Globe,
	Highlighter,
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
	"highlights/index": { icon: Highlighter, label: "하이라이트" },
	"settings/index": { icon: Settings, label: "설정" },
};

interface CustomTabBarProps extends BottomTabBarProps {}

export function CustomTabBar({
	state,
	descriptors,
	navigation,
}: CustomTabBarProps) {
	const insets = useSafeAreaInsets();
	const { tabBarTranslateY } = useBrowserScroll();
	const barHeight = useSharedValue(0);
	const { isKeyboardVisible } = useKeyboardHeight();
	const isDark = useColorScheme() === "dark";

	// 안쪽 바가 absolute라 래퍼는 높이를 스스로 갖지 못한다. 측정 전(0)에도 항상 높이를 지정해야 한다.
	// 스크롤 숨김 오프셋은 각 화면이 떠날 때 0으로 되돌리므로 여기서 탭별로 가르지 않는다.
	const wrapperStyle = useAnimatedStyle(() => {
		return {
			height: Math.max(0, barHeight.value - tabBarTranslateY.value),
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
				// Android는 래퍼 높이를 줄이면 흐름 안의 자식도 같이 줄어든다. 그러면 아래 onLayout이
				// 숨김을 폴더블 변화로 오인해 오프셋을 0으로 되돌려 탭바가 숨지 않으므로, absolute로 빼서
				// 래퍼 높이와 무관하게 원래 높이를 재게 한다.
				style={{
					paddingBottom: insets.bottom,
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
				}}
				// 폴더블을 접거나 펴면 액티비티 재생성 없이 레이아웃만 다시 잡혀 inset과 바 높이가 바뀐다.
				// 최초 한 번만 기록하면 옛 높이 기준으로 visibleHeight가 0에 고정되어 탭바가 사라지므로,
				// 높이가 바뀔 때마다 갱신하고 스크롤 숨김 오프셋도 되돌려 탭바를 다시 보인다.
				// 래퍼가 움직이는 동안 Android 픽셀 스냅으로 높이가 1px 미만 흔들리므로 그 정도는 무시한다.
				onLayout={(e) => {
					const nextHeight = e.nativeEvent.layout.height;
					if (Math.abs(nextHeight - barHeight.value) < 1) return;

					const hadHeight = barHeight.value !== 0;
					barHeight.value = nextHeight;
					if (hadHeight) {
						tabBarTranslateY.value = 0;
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
