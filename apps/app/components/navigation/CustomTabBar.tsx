import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FileText, Globe, Settings } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: isBrowserActive.value === 1 ? tabBarTranslateY.value : 0,
      },
    ],
  }));

  return (
    <Animated.View style={[styles.container, { paddingBottom: insets.bottom }, animatedStyle]}>
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
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Icon size={22} color={isFocused ? "#111" : "#999"} />
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 2,
  },
  label: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  labelActive: {
    color: "#111",
    fontWeight: "600",
  },
});
