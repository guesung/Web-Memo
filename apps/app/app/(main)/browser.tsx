import { DraggableFab } from "@/components/browser/DraggableFab";
import { MemoPanel } from "@/components/browser/MemoPanel";
import { TechBlogBottomSheet } from "@/components/browser/TechBlogBottomSheet";
import { TechBlogLinks } from "@/components/browser/TechBlogLinks";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutGrid,
  RotateCw,
  Search,
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
  StyleSheet,
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
import { useLocalSearchParams } from "expo-router";
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
        var delta = window.scrollY - lastScrollY;
        if (Math.abs(delta) > 5) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll', direction: delta > 0 ? 'down' : 'up', scrollY: window.scrollY
          }));
          lastScrollY = window.scrollY;
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
      wishToggleLocal.mutate(currentUrl);
    }
    setWishToast(isCurrentPageWish ? "위시리스트에서 제거" : "위시리스트에 추가");
    setTimeout(() => setWishToast(null), 1500);
  }, [currentUrl, pageTitle, pageFavIconUrl, isLoggedIn, isCurrentPageWish, wishToggleSupabase, wishToggleLocal]);

  const openPanel = useCallback(() => {
    if (isMemoOpen || contentHeight <= 0) return;
    setIsMemoOpen(true);
    const defaultH = contentHeight * savedRatio;
    panelHeight.value = withSpring(defaultH, SPRING_CONFIG);
    headerTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
    tabBarTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
  }, [isMemoOpen, contentHeight, panelHeight, savedRatio, headerTranslateY, tabBarTranslateY]);

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
        tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT, { duration: HIDE_DURATION });
      } else if (direction === "up" || scrollY < 10) {
        headerTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
        tabBarTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
      }
    },
    [isMemoOpen, headerTranslateY, tabBarTranslateY],
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

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const handleBlogSelect = useCallback((url: string) => {
    setCurrentUrl(url);
    setPageTitle("");
  }, []);

  if (!currentUrl) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView style={styles.emptyContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.emptySearchBarWrap}>
            <View style={styles.emptySearchBar}>
              <Search size={18} color="#999" />
              <TextInput
                style={styles.emptySearchInput}
                value={urlInput}
                onChangeText={setUrlInput}
                onSubmitEditing={handleUrlSubmit}
                placeholder="URL 입력 또는 검색"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
              />
            </View>
          </View>
          <TechBlogLinks onSelectBlog={handleBlogSelect} />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.browserHeader, headerAnimatedStyle]}>
        <TouchableOpacity
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
          style={styles.navBtn}
        >
          <ChevronLeft size={20} color={canGoBack ? "#111" : "#ccc"} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
          style={styles.navBtn}
        >
          <ChevronRight size={20} color={canGoForward ? "#111" : "#ccc"} />
        </TouchableOpacity>
        <View style={styles.browserUrlBar}>
          <Search size={14} color="#999" />
          <TextInput
            style={styles.browserUrlInput}
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
        </View>
        <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.navBtn}>
          <RotateCw size={16} color="#111" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsBlogSheetOpen(true)} style={styles.navBtn}>
          <LayoutGrid size={16} color="#111" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleWishToggle} style={styles.navBtn}>
          <Heart
            size={16}
            color={isCurrentPageWish ? "#ec4899" : "#111"}
            fill={isCurrentPageWish ? "#ec4899" : "none"}
          />
        </TouchableOpacity>
      </Animated.View>

      <View
        style={styles.contentArea}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleWebViewMessage}
            injectedJavaScript={SCROLL_DETECT_JS}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            allowsBackForwardNavigationGestures
          />
        </View>

        <Animated.View style={[styles.memoContainer, memoAnimatedStyle]}>
          <GestureDetector gesture={resizeGesture}>
            <Animated.View style={styles.dragHandle}>
              <View style={styles.dragHandleBar} />
            </Animated.View>
          </GestureDetector>
          <MemoPanel url={currentUrl} pageTitle={pageTitle} favIconUrl={pageFavIconUrl} onClose={closePanel} />
        </Animated.View>
      </View>

      <DraggableFab
        onPress={toggleMemo}
        panelHeight={panelHeight}
        bottomInset={insets.bottom}
      />

      {wishToast ? (
        <View style={[styles.wishToast, { bottom: insets.bottom + 84 }]}>
          <Heart size={14} fill="#ec4899" color="#ec4899" />
          <Text style={styles.wishToastText}>{wishToast}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  emptyContainer: { flex: 1, paddingTop: 16 },
  emptySearchBarWrap: { paddingHorizontal: 20 },
  emptySearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  emptySearchInput: { flex: 1, fontSize: 16, color: "#333", padding: 0 },
  browserHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    zIndex: 10,
  },
  navBtn: { padding: 6 },
  browserUrlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  browserUrlInput: { flex: 1, fontSize: 14, color: "#333", padding: 0 },
  contentArea: { flex: 1 },
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  memoContainer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dragHandle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
  },
  wishToast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  wishToastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
