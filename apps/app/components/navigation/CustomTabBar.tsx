import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FileText, Globe, Settings } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowserScroll } from "@/lib/context/BrowserScrollContext";

const TAB_CONFIG: Record<string, { icon: typeof FileText; label: string }> = {
  index: { icon: FileText, label: "메모" },
  browser: { icon: Globe, label: "브라우저" },
  settings: { icon: Settings, label: "설정" },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { tabBarTranslateY, isBrowserActive } = useBrowserScroll();
  const barHeight = useSharedValue(0);

  const wrapperStyle = useAnimatedStyle(() => {
    if (isBrowserActive.value !== 1 || barHeight.value === 0) return {};
    const visibleHeight = Math.max(0, barHeight.value - tabBarTranslateY.value);
    return {
      height: visibleHeight,
      overflow: "hidden" as const,
    };
  });

  return (
    <Animated.View style={wrapperStyle}>
      <View
        className="flex-row bg-white border-t border-border pt-2"
        style={{ paddingBottom: insets.bottom }}
        onLayout={(e) => {
          if (barHeight.value === 0) {
            barHeight.value = e.nativeEvent.layout.height;
          }
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const Icon = config.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              className="flex-1 items-center justify-center py-1 gap-0.5"
              activeOpacity={0.7}
            >
              <Icon size={22} color={isFocused ? "#111" : "#999"} />
              <Text className={`text-[11px] mt-0.5 ${isFocused ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}
