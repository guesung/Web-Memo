import { DraggableFab } from "@/components/browser/DraggableFab";
import { FavoriteLinks } from "@/components/browser/FavoriteLinks";
import { MemoPanel } from "@/components/browser/MemoPanel";
import { TechBlogBottomSheet } from "@/components/browser/TechBlogBottomSheet";
import { TechBlogLinks } from "@/components/browser/TechBlogLinks";
import { useFavoriteToggle, useIsFavorite } from "@/lib/hooks/useFavorites";
import {
  Heart,
  Home,
  LayoutGrid,
  RotateCw,
  Search,
  Star,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import { useLocalMemoByUrl, useLocalMemoWishToggle } from "@/lib/hooks/useLocalMemos";
import { useMemoWishToggleMutation } from "@/lib/hooks/useMemoMutation";
import { useBrowserScroll } from "@/lib/context/BrowserScrollContext";
import { getPanelRatio, savePanelRatio } from "@/lib/storage/browserPreferences";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { WebViewNavigation } from "react-native-webview";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

const SPRING_CONFIG = { damping: 20, stiffness: 150 };
const MIN_PANEL_RATIO = 0.15;
const MAX_PANEL_RATIO = 0.8;
const DEFAULT_PANEL_RATIO = 0.4;
const HEADER_HEIGHT = 44;
const TAB_BAR_HEIGHT = 60;
const HIDE_DURATION = 250;

const FAVICON_EXTRACT_JS = `
(function() {
  var el = document.querySelector('link[rel="icon"]')
    || document.querySelector('link[rel="shortcut icon"]')
    || document.querySelector('link[rel="apple-touch-icon-precomposed"]')
    || document.querySelector('link[rel="apple-touch-icon"]');
  var href = el && el.href ? el.href : (window.location.origin + '/favicon.ico');
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'favicon', url: href }));
})();
true;
`;

const SCROLL_DETECT_JS = `
(function() {
  if (window.__webmemoScrollSetup) return;
  window.__webmemoScrollSetup = true;
  var lastScrollY = window.scrollY;
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var currentY = window.scrollY;
        if (currentY <= 5) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll', direction: 'top', scrollY: currentY
          }));
          lastScrollY = currentY;
        } else {
          var delta = currentY - lastScrollY;
          if (Math.abs(delta) > 5) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll', direction: delta > 0 ? 'down' : 'up', scrollY: currentY
            }));
            lastScrollY = currentY;
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})(); true;
`;

const INJECTED_JS = `${FAVICON_EXTRACT_JS}\n${SCROLL_DETECT_JS}`;

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const { url: paramUrl } = useLocalSearchParams<{ url?: string }>();

  const [currentUrl, setCurrentUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageFavIconUrl, setPageFavIconUrl] = useState<string | undefined>(undefined);
  const [urlInput, setUrlInput] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [isBlogSheetOpen, setIsBlogSheetOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [wishToast, setWishToast] = useState<string | null>(null);
  const [savedRatio, setSavedRatio] = useState(DEFAULT_PANEL_RATIO);

  const { session } = useAuth();
  const isLoggedIn = !!session;

  const { data: supabaseMemo } = useSupabaseMemoByUrl(currentUrl, isLoggedIn);
  const { data: localMemo } = useLocalMemoByUrl(currentUrl);
  const wishToggleSupabase = useMemoWishToggleMutation();
  const wishToggleLocal = useLocalMemoWishToggle();

  const isCurrentPageWish = isLoggedIn
    ? supabaseMemo?.isWish ?? false
    : localMemo?.isWish ?? false;

  const { data: isCurrentPageFavorite } = useIsFavorite(currentUrl);
  const favoriteToggle = useFavoriteToggle();

  const panelHeight = useSharedValue(0);
  const dragStartHeight = useSharedValue(0);

  const { tabBarTranslateY, headerTranslateY, isBrowserActive } = useBrowserScroll();

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
  }, [paramUrl]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);
    setPageTitle(navState.title ?? "");
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setPageFavIconUrl(undefined);
    try {
      const parsed = new URL(navState.url);
      setUrlInput(parsed.hostname.replace("www.", ""));
    } catch {
      setUrlInput(navState.url);
    }

    if (navState.loading === false) {
      webViewRef.current?.injectJavaScript(INJECTED_JS);
    }
  };

  const handleUrlSubmit = () => {
    let url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.includes(".") && !url.includes(" ")) {
        url = `https://${url}`;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    Keyboard.dismiss();
    setCurrentUrl(url);
    setPageTitle("");
    if (isMemoOpen) {
      setIsMemoOpen(false);
      panelHeight.value = withSpring(0, SPRING_CONFIG);
    }
  };

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
      wishToggleLocal.mutate({ url: currentUrl, title: pageTitle, favIconUrl: pageFavIconUrl });
    }
    setWishToast(isCurrentPageWish ? "위시리스트에서 제거" : "위시리스트에 추가");
    setTimeout(() => setWishToast(null), 2500);
  }, [currentUrl, pageTitle, pageFavIconUrl, isLoggedIn, isCurrentPageWish, wishToggleSupabase, wishToggleLocal]);

  const handleFavoriteToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    favoriteToggle.mutate({
      url: currentUrl,
      title: pageTitle,
      favIconUrl: pageFavIconUrl,
      currentIsFavorite: !!isCurrentPageFavorite,
    });
  }, [currentUrl, pageTitle, pageFavIconUrl, isCurrentPageFavorite, favoriteToggle]);

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
        headerTranslateY.value = withTiming(-HEADER_HEIGHT, { duration: HIDE_DURATION });
        tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT + insets.bottom, { duration: HIDE_DURATION });
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

  const persistRatio = useCallback(
    (ratio: number) => {
      setSavedRatio(ratio);
      savePanelRatio(ratio);
    },
    [],
  );

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

  if (!currentUrl) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <ScrollView className="flex-1 pt-4" keyboardShouldPersistTaps="handled">
          <View className="px-5">
            <View className="flex-row items-center bg-input rounded-[14px] px-3.5 py-3 gap-2.5">
              <Search size={18} color="#999" />
              <TextInput
                className="flex-1 text-base text-[#333] p-0"
                value={urlInput}
                onChangeText={setUrlInput}
                onSubmitEditing={handleUrlSubmit}
                placeholder="검색어를 입력하세요"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="go"
              />
            </View>
          </View>
          <FavoriteLinks onSelectUrl={handleBlogSelect} />
          <TechBlogLinks onSelectBlog={handleBlogSelect} />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View className="overflow-hidden" style={headerWrapperStyle}>
        <View className="flex-row items-center px-1.5 py-1.5 gap-0.5 border-b border-border bg-white">
          <View className="flex-1 flex-row items-center bg-input rounded-[10px] px-2.5 py-2 gap-1.5">
            <Search size={14} color="#999" />
            <TextInput
              className="flex-1 text-sm text-[#333] p-0"
              value={urlInput}
              onChangeText={setUrlInput}
              onFocus={() => setUrlInput(currentUrl)}
              onSubmitEditing={handleUrlSubmit}
              placeholder="Search or enter URL"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
            />
            {urlInput.length > 0 && (
              <TouchableOpacity onPress={() => setUrlInput("")} hitSlop={8}>
                <X size={14} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => webViewRef.current?.reload()} className="p-1.5">
            <RotateCw size={16} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentUrl(""); setUrlInput(""); setPageTitle(""); }} className="p-1.5">
            <Home size={16} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsBlogSheetOpen(true)} className="p-1.5">
            <LayoutGrid size={16} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFavoriteToggle} className="p-1.5">
            <Star
              size={16}
              color={isCurrentPageFavorite ? "#f59e0b" : "#111"}
              fill={isCurrentPageFavorite ? "#f59e0b" : "none"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWishToggle} className="p-1.5">
            <Heart
              size={16}
              color={isCurrentPageWish ? "#ec4899" : "#111"}
              fill={isCurrentPageWish ? "#ec4899" : "none"}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View
        className="flex-1"
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <View className="flex-1">
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleWebViewMessage}
            injectedJavaScript={SCROLL_DETECT_JS}
            className="flex-1"
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            allowsBackForwardNavigationGestures
          />
        </View>

        <Animated.View className="border-t border-border bg-white overflow-hidden" style={memoAnimatedStyle}>
          <GestureDetector gesture={resizeGesture}>
            <Animated.View className="items-center justify-center py-2">
              <View className="w-9 h-1 rounded-sm bg-gray-300" />
            </Animated.View>
          </GestureDetector>
          <MemoPanel url={currentUrl} pageTitle={pageTitle} favIconUrl={pageFavIconUrl} onClose={closePanel} />
        </Animated.View>
      </View>

      {!isMemoOpen && (
        <DraggableFab
          onPress={toggleMemo}
          panelHeight={panelHeight}
          bottomInset={insets.bottom}
        />
      )}

      {wishToast ? (
        <View className="absolute self-center flex-row items-center gap-1.5 bg-black/80 px-4 py-2.5 rounded-[20px]" style={{ bottom: insets.bottom + 84 }}>
          <Heart size={14} fill="#ec4899" color="#ec4899" />
          <Text className="text-white text-sm font-semibold">{wishToast}</Text>
          {wishToast === "위시리스트에 추가" ? (
            <TouchableOpacity
              className="ml-1.5 bg-white/20 px-2.5 py-1 rounded-xl"
              onPress={() => {
                setWishToast(null);
                router.navigate({ pathname: "/(main)", params: { filter: "wish" } });
              }}
            >
              <Text className="text-white text-xs font-semibold">이동하기</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <TechBlogBottomSheet
        visible={isBlogSheetOpen}
        onClose={() => setIsBlogSheetOpen(false)}
        onSelectBlog={(url) => {
          setIsBlogSheetOpen(false);
          setCurrentUrl(url);
          setPageTitle("");
        }}
      />
    </KeyboardAvoidingView>
  );
}
