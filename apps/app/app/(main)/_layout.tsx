import { Tabs } from "expo-router";
import { BrowserScrollProvider } from "@/lib/context/BrowserScrollContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { CustomTabBar } from "./_components/CustomTabBar";

/** 탭 화면들이 공유하는 다크 배경색. 네 화면의 `dark:bg-neutral-950`과 같은 값이다 */
const DARK_SCENE_BACKGROUND = "#0a0a0a";
/** 탭 화면들이 공유하는 라이트 배경색 */
const LIGHT_SCENE_BACKGROUND = "#ffffff";

/**
 * 탭 네비게이터.
 *
 * @description 씬 배경을 테마에 맞춰 직접 지정한다. expo-router는 `DarkTheme`을
 * 쓰지 않으면 항상 밝은 `DefaultTheme`을 따르므로, 다크모드에서 탭을 오갈 때
 * 화면이 마운트되기 전 한 프레임이 밝은 회색으로 드러나 깜빡임처럼 보인다.
 * 루트 Stack(`app/_layout.tsx`의 `ThemedStack`)이 이미 같은 이유로 `contentStyle`을
 * 거는데 탭 레이어에는 빠져 있었다. 씬·화면·탭바 배경이 모두 같은 값이어야
 * 깜빡임이 사라지므로, 하나라도 바꾸면 나머지도 같이 맞춰야 한다.
 */
export default function MainLayout() {
	const { isDark } = useTheme();
	const sceneBackground = isDark
		? DARK_SCENE_BACKGROUND
		: LIGHT_SCENE_BACKGROUND;

	return (
		<BrowserScrollProvider>
			<Tabs
				tabBar={(props) => <CustomTabBar {...props} />}
				screenOptions={{
					headerShown: false,
					sceneStyle: { backgroundColor: sceneBackground },
				}}
			>
				<Tabs.Screen name="index" />
				<Tabs.Screen name="browser/index" />
				<Tabs.Screen name="highlights/index" />
				<Tabs.Screen name="settings/index" />
			</Tabs>
		</BrowserScrollProvider>
	);
}
