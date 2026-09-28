import { useNavigation } from "expo-router";
import { useEffect, useRef } from "react";
import type {
	LayoutChangeEvent,
	NativeScrollEvent,
	NativeSyntheticEvent,
} from "react-native";
import { withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowserScroll } from "@/lib/context/BrowserScrollContext";

/**
 * 목록을 아래로 스크롤하면 하단 탭바를 숨기고, 위로 올리면 다시 보인다.
 *
 * @description 브라우저 탭의 웹뷰 스크롤 감지(`SCROLL_DETECT_JS`)와 같은 규칙을 따른다.
 * 맨 위 근처에서는 항상 보이고, 맨 아래 여유 구간에서는 iOS 바운스로 방향이 요동쳐
 * 탭바가 깜빡이므로 상태를 바꾸지 않는다. 화면을 떠나면 다음 탭이 숨은 탭바를
 * 물려받지 않도록 되돌린다.
 *
 * 반환값의 `scrollProps`를 FlatList/ScrollView에 그대로 펼쳐 넣는다. 목록이 사라지는
 * 경우(필터 결과가 비어 빈 화면으로 바뀌는 등)에는 스크롤 이벤트가 오지 않으므로
 * `showTabBar`를 직접 불러 탭바를 되돌린다.
 */
export function useTabBarHideOnScroll(): TUseTabBarHideOnScrollReturn {
	const { tabBarTranslateY } = useBrowserScroll();
	const insets = useSafeAreaInsets();
	const navigation = useNavigation();
	const lastScrollYRef = useRef(0);
	const layoutHeightRef = useRef(0);

	const showTabBar = () => {
		tabBarTranslateY.value = withTiming(0, { duration: 250 });
	};

	const hideTabBar = () => {
		tabBarTranslateY.value = withTiming(60 + insets.bottom, {
			duration: 250,
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: tabBarTranslateY는 공유 값이라 참조가 바뀌지 않는다
	useEffect(() => {
		const unsubscribe = navigation.addListener("blur", () => {
			lastScrollYRef.current = 0;
			tabBarTranslateY.value = withTiming(0, { duration: 250 });
		});

		return unsubscribe;
	}, [navigation]);

	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		const maxScrollY = Math.max(
			0,
			contentSize.height - layoutMeasurement.height,
		);
		const scrollY = Math.min(Math.max(0, contentOffset.y), maxScrollY);

		if (scrollY <= 10) {
			lastScrollYRef.current = scrollY;
			showTabBar();
			return;
		}
		if (maxScrollY - scrollY <= 120) {
			lastScrollYRef.current = scrollY;
			return;
		}

		const scrollDelta = scrollY - lastScrollYRef.current;
		if (Math.abs(scrollDelta) <= 5) {
			return;
		}

		lastScrollYRef.current = scrollY;
		if (scrollDelta > 0) {
			hideTabBar();
		} else {
			showTabBar();
		}
	};

	const handleLayout = (event: LayoutChangeEvent) => {
		layoutHeightRef.current = event.nativeEvent.layout.height;
	};

	// 삭제·필터로 목록이 짧아져 더는 스크롤할 수 없으면 스크롤 이벤트도 오지 않아 숨은 채로 갇힌다.
	const handleContentSizeChange = (_width: number, height: number) => {
		if (height - layoutHeightRef.current <= 120) {
			showTabBar();
		}
	};

	return {
		scrollProps: {
			onScroll: handleScroll,
			onLayout: handleLayout,
			onContentSizeChange: handleContentSizeChange,
			scrollEventThrottle: 16,
		},
		showTabBar,
	};
}

/** {@link useTabBarHideOnScroll}의 반환값 */
type TUseTabBarHideOnScrollReturn = {
	/** FlatList/ScrollView에 펼쳐 넣을 스크롤 관련 props */
	scrollProps: {
		onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
		onLayout: (event: LayoutChangeEvent) => void;
		onContentSizeChange: (width: number, height: number) => void;
		scrollEventThrottle: number;
	};
	/** 탭바를 즉시 다시 보인다. 목록이 사라져 스크롤 이벤트가 끊길 때 쓴다 */
	showTabBar: () => void;
};
