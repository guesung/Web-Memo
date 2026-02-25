import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { WebViewNavigation } from "react-native-webview";
import type WebView from "react-native-webview";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBrowserScroll } from "@/lib/context/BrowserScrollContext";
import {
	useLocalMemoByUrl,
	useLocalMemoWishToggle,
} from "@/lib/hooks/useLocalMemos";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import { useFavoriteToggle, useIsFavorite } from "@/lib/hooks/useFavorites";
import { useMemoWishToggleMutation } from "@/lib/hooks/useMemoMutation";
import { getPanelRatio, savePanelRatio } from "../_utils/browserPreferences";
import { formatUrl } from "../_utils/formatUrl";
import {
	INJECTED_JS_ON_NAVIGATION,
	SCROLL_DETECT_JS,
} from "../_utils/webViewScripts";

const SPRING_CONFIG = { damping: 20, stiffness: 150 };
const MIN_PANEL_RATIO = 0.15;
const MAX_PANEL_RATIO = 0.8;
const DEFAULT_PANEL_RATIO = 0.4;
const HEADER_HEIGHT = 44;
const TAB_BAR_HEIGHT = 60;
const HIDE_DURATION = 250;

export function useBrowserState() {
	const insets = useSafeAreaInsets();
	const webViewRef = useRef<WebView>(null);
	const { url: paramUrl } = useLocalSearchParams<{ url?: string }>();

	const [currentUrl, setCurrentUrl] = useState("");
	const [pageTitle, setPageTitle] = useState("");
	const [pageFavIconUrl, setPageFavIconUrl] = useState<string | undefined>(
		undefined,
	);
	const [urlInput, setUrlInput] = useState("");
	const [isMemoOpen, setIsMemoOpen] = useState(false);
	const [isBlogSheetOpen, setIsBlogSheetOpen] = useState(false);
	const [contentHeight, setContentHeight] = useState(0);
	const [wishToast, setWishToast] = useState<string | null>(null);
	const [savedRatio, setSavedRatio] = useState(DEFAULT_PANEL_RATIO);

	const { isLoggedIn } = useAuth();

	const { data: supabaseMemo } = useSupabaseMemoByUrl(currentUrl, isLoggedIn);
	const { data: localMemo } = useLocalMemoByUrl(currentUrl);
	const wishToggleSupabase = useMemoWishToggleMutation();
	const wishToggleLocal = useLocalMemoWishToggle();

	const isCurrentPageWish = isLoggedIn
		? (supabaseMemo?.isWish ?? false)
		: (localMemo?.isWish ?? false);

	const { data: isCurrentPageFavorite } = useIsFavorite(currentUrl);
	const favoriteToggle = useFavoriteToggle();

	const panelHeight = useSharedValue(0);
	const dragStartHeight = useSharedValue(0);

	const { tabBarTranslateY, headerTranslateY, isBrowserActive } =
		useBrowserScroll();

	useEffect(() => {
		getPanelRatio().then((ratio) => {
			if (ratio !== null) setSavedRatio(ratio);
		});
	}, []);

	useFocusEffect(
		useCallback(() => {
			isBrowserActive.value = 1;
			return () => {
				isBrowserActive.value = 0;
				tabBarTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
				headerTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
			};
		}, [isBrowserActive, tabBarTranslateY, headerTranslateY]),
	);

	useEffect(() => {
		if (paramUrl) {
			const decoded = decodeURIComponent(paramUrl);
			setCurrentUrl(decoded);
			setPageTitle("");
			if (isMemoOpen) {
				setIsMemoOpen(false);
				panelHeight.value = withSpring(0, SPRING_CONFIG);
			}
		}
	}, [paramUrl, isMemoOpen, panelHeight]);

	const handleNavigationStateChange = (navState: WebViewNavigation) => {
		setCurrentUrl(navState.url);
		setPageTitle(navState.title ?? "");
		setPageFavIconUrl(undefined);
		try {
			const parsed = new URL(navState.url);
			setUrlInput(parsed.hostname.replace("www.", ""));
		} catch {
			setUrlInput(navState.url);
		}

		if (navState.loading === false) {
			webViewRef.current?.injectJavaScript(INJECTED_JS_ON_NAVIGATION);
		}
	};

	const handleUrlSubmit = () => {
		const url = formatUrl(urlInput);
		if (!url) return;
		Keyboard.dismiss();
		setCurrentUrl(url);
		setPageTitle("");
		if (isMemoOpen) {
			setIsMemoOpen(false);
			panelHeight.value = withSpring(0, SPRING_CONFIG);
		}
	};

	const handleFavoriteToggle = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		favoriteToggle.mutate({
			url: currentUrl,
			title: pageTitle,
			favIconUrl: pageFavIconUrl,
			currentIsFavorite: !!isCurrentPageFavorite,
		});
	}, [
		currentUrl,
		pageTitle,
		pageFavIconUrl,
		isCurrentPageFavorite,
		favoriteToggle,
	]);

	const handleWishToggle = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (isLoggedIn) {
			wishToggleSupabase.mutate({
				url: currentUrl,
				title: pageTitle,
				favIconUrl: pageFavIconUrl,
				currentIsWish: isCurrentPageWish,
			});
		} else {
			wishToggleLocal.mutate({
				url: currentUrl,
				title: pageTitle,
				favIconUrl: pageFavIconUrl,
			});
		}
		setWishToast(
			isCurrentPageWish ? "위시리스트에서 제거" : "위시리스트에 추가",
		);
		setTimeout(() => setWishToast(null), 1500);
	}, [
		currentUrl,
		pageTitle,
		pageFavIconUrl,
		isLoggedIn,
		isCurrentPageWish,
		wishToggleSupabase,
		wishToggleLocal,
	]);

	const openPanel = useCallback(() => {
		if (isMemoOpen || contentHeight <= 0) return;
		setIsMemoOpen(true);
		const defaultH = contentHeight * savedRatio;
		panelHeight.value = withSpring(defaultH, SPRING_CONFIG);
	}, [isMemoOpen, contentHeight, panelHeight, savedRatio]);

	const closePanel = useCallback(() => {
		if (!isMemoOpen) return;
		setIsMemoOpen(false);
		panelHeight.value = withSpring(0, SPRING_CONFIG);
		Keyboard.dismiss();
	}, [isMemoOpen, panelHeight]);

	const handleScrollMessage = useCallback(
		(direction: string, scrollY: number) => {
			if (isMemoOpen) return;
			if (direction === "down") {
				headerTranslateY.value = withTiming(-HEADER_HEIGHT, {
					duration: HIDE_DURATION,
				});
				tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT + insets.bottom, {
					duration: HIDE_DURATION,
				});
			} else if (direction === "up" || direction === "top" || scrollY < 10) {
				headerTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
				tabBarTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
			}
		},
		[isMemoOpen, headerTranslateY, tabBarTranslateY, insets.bottom],
	);

	const handleWebViewMessage = useCallback(
		(event: { nativeEvent: { data: string } }) => {
			try {
				const message = JSON.parse(event.nativeEvent.data);
				if (message.type === "favicon" && message.url) {
					setPageFavIconUrl(message.url);
				} else if (message.type === "scroll") {
					handleScrollMessage(message.direction, message.scrollY);
				}
			} catch {}
		},
		[handleScrollMessage],
	);

	const toggleMemo = useCallback(() => {
		if (isMemoOpen) {
			closePanel();
		} else {
			openPanel();
		}
	}, [isMemoOpen, closePanel, openPanel]);

	const persistRatio = useCallback((ratio: number) => {
		setSavedRatio(ratio);
		savePanelRatio(ratio);
	}, []);

	const resizeGesture = Gesture.Pan()
		.onStart(() => {
			dragStartHeight.value = panelHeight.value;
		})
		.onUpdate((event) => {
			const newHeight = dragStartHeight.value - event.translationY;
			const minH = contentHeight * MIN_PANEL_RATIO;
			const maxH = contentHeight * MAX_PANEL_RATIO;
			panelHeight.value = Math.max(minH, Math.min(maxH, newHeight));
		})
		.onEnd(() => {
			if (contentHeight > 0) {
				const currentRatio = panelHeight.value / contentHeight;
				runOnJS(persistRatio)(currentRatio);
			}
		});

	const memoAnimatedStyle = useAnimatedStyle(() => ({
		height: Math.max(0, panelHeight.value),
	}));

	const headerWrapperStyle = useAnimatedStyle(() => ({
		height: Math.max(0, HEADER_HEIGHT + headerTranslateY.value),
	}));

	const handleBlogSelect = useCallback((url: string) => {
		setCurrentUrl(url);
		setPageTitle("");
	}, []);

	return {
		insets,
		webViewRef,
		currentUrl,
		urlInput,
		setUrlInput,
		isMemoOpen,
		isBlogSheetOpen,
		setIsBlogSheetOpen,
		contentHeight,
		setContentHeight,
		wishToast,
		pageTitle,
		pageFavIconUrl,
		isCurrentPageWish,
		isCurrentPageFavorite: !!isCurrentPageFavorite,
		handleFavoriteToggle,
		panelHeight,
		headerWrapperStyle,
		memoAnimatedStyle,
		resizeGesture,
		handleUrlSubmit,
		handleNavigationStateChange,
		handleWebViewMessage,
		handleWishToggle,
		toggleMemo,
		openPanel,
		closePanel,
		handleBlogSelect,
		SCROLL_DETECT_JS,
	};
}
