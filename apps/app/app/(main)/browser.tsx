import { MemoPanel } from "@/components/browser/MemoPanel";
import { useAutoOpenMemo } from "@/lib/hooks/useAutoOpenMemo";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  PenLine,
  RotateCw,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { WebViewNavigation } from "react-native-webview";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

const SPRING_CONFIG = { damping: 20, stiffness: 150 };
const MIN_PANEL_RATIO = 0.15;
const MAX_PANEL_RATIO = 0.8;
const DEFAULT_PANEL_RATIO = 0.4;

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
  const [contentHeight, setContentHeight] = useState(0);

  const panelHeight = useSharedValue(0);
  const dragStartHeight = useSharedValue(0);

  useEffect(() => {
    if (paramUrl) {
      const decoded = decodeURIComponent(paramUrl);
      setCurrentUrl(decoded);
      setPageTitle("");
      if (isMemoOpen) {
        panelHeight.value = withSpring(0, SPRING_CONFIG, (finished) => {
          if (finished) {
            runOnJS(setIsMemoOpen)(false);
          }
        });
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
      webViewRef.current?.injectJavaScript(FAVICON_EXTRACT_JS);
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
      panelHeight.value = withSpring(0, SPRING_CONFIG, (finished) => {
        if (finished) {
          runOnJS(setIsMemoOpen)(false);
        }
      });
    }
  };

  const openPanel = useCallback(() => {
    if (isMemoOpen || contentHeight <= 0) return;
    setIsMemoOpen(true);
    const defaultH = contentHeight * DEFAULT_PANEL_RATIO;
    panelHeight.value = withSpring(defaultH, SPRING_CONFIG);
  }, [isMemoOpen, contentHeight, panelHeight]);

  const closePanel = useCallback(() => {
    if (!isMemoOpen) return;
    panelHeight.value = withSpring(0, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(setIsMemoOpen)(false);
      }
    });
    Keyboard.dismiss();
  }, [isMemoOpen, panelHeight]);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "favicon" && message.url) {
        setPageFavIconUrl(message.url);
      }
    } catch {}
  }, []);

  const { markManuallyClosed } = useAutoOpenMemo({
    url: currentUrl,
    isMemoOpen,
    contentHeight,
    openPanel,
  });

  const toggleMemo = useCallback(() => {
    if (isMemoOpen) {
      markManuallyClosed(currentUrl);
      closePanel();
    } else {
      openPanel();
    }
  }, [isMemoOpen, currentUrl, markManuallyClosed, closePanel, openPanel]);

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
      const minH = contentHeight * MIN_PANEL_RATIO;
      if (panelHeight.value <= minH) {
        panelHeight.value = withSpring(0, SPRING_CONFIG, (finished) => {
          if (finished) {
            runOnJS(setIsMemoOpen)(false);
            runOnJS(Keyboard.dismiss)();
            runOnJS(markManuallyClosed)(currentUrl);
          }
        });
      }
    });

  const memoAnimatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    overflow: "hidden" as const,
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    bottom: panelHeight.value > 0 ? panelHeight.value + 12 : insets.bottom + 20,
  }));

  if (!currentUrl) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
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
          <View style={styles.emptyState}>
            <Globe size={48} color="#ddd" />
            <Text style={styles.emptyText}>URL을 입력해서 웹서핑을 시작하세요</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.browserHeader}>
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
      </View>

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
          {isMemoOpen && <MemoPanel url={currentUrl} pageTitle={pageTitle} favIconUrl={pageFavIconUrl} />}
        </Animated.View>
      </View>

      <Animated.View style={[styles.fabContainer, fabAnimatedStyle]}>
        <TouchableOpacity
          style={[styles.fab, isMemoOpen && styles.fabActive]}
          onPress={toggleMemo}
          activeOpacity={0.8}
        >
          {isMemoOpen ? <X size={24} color="#fff" /> : <PenLine size={24} color="#fff" />}
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  emptyContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
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
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#bbb" },
  browserHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
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
  fabContainer: {
    position: "absolute",
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabActive: { backgroundColor: "#666" },
});
