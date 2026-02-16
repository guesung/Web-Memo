import { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  PenLine,
  X,
  Globe,
  FileText,
  Home,
} from "lucide-react-native";
import { MemoPanel } from "@/components/browser/MemoPanel";
import { useLocalMemos } from "@/lib/hooks/useLocalMemos";
import type { LocalMemo } from "@/lib/storage/localMemo";

type Mode = "home" | "browser";

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  // Mode: home or browser
  const [mode, setMode] = useState<Mode>("home");

  // Browser state
  const [currentUrl, setCurrentUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Memo panel state
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Local memos
  const { data: memos = [], isLoading, refetch } = useLocalMemos();

  const navigateTo = useCallback((url: string) => {
    setCurrentUrl(url);
    setMode("browser");
    setIsMemoOpen(false);
    slideAnim.setValue(0);
  }, [slideAnim]);

  const goHome = useCallback(() => {
    setMode("home");
    setCurrentUrl("");
    setUrlInput("");
    setIsMemoOpen(false);
    slideAnim.setValue(0);
    refetch();
  }, [slideAnim, refetch]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);
    setPageTitle(navState.title ?? "");
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);

    try {
      const parsed = new URL(navState.url);
      setUrlInput(parsed.hostname.replace("www.", ""));
    } catch {
      setUrlInput(navState.url);
    }
  };

  const handleUrlSubmit = (input?: string) => {
    let url = (input ?? urlInput).trim();
    if (!url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.includes(".") && !url.includes(" ")) {
        url = "https://" + url;
      } else {
        url = "https://www.google.com/search?q=" + encodeURIComponent(url);
      }
    }

    Keyboard.dismiss();
    navigateTo(url);
  };

  const toggleMemo = useCallback(() => {
    const toValue = isMemoOpen ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
    setIsMemoOpen(!isMemoOpen);
    if (isMemoOpen) Keyboard.dismiss();
  }, [isMemoOpen, slideAnim]);

  const memoPanelHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "45%"],
  });

  // ─── HOME MODE ───
  if (mode === "home") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.homeContent}>
          {/* Branding */}
          <View style={styles.branding}>
            <Text style={styles.brandTitle}>Web Memo</Text>
            <Text style={styles.brandSubtitle}>
              웹서핑하며 메모하세요
            </Text>
          </View>

          {/* Search / URL Bar */}
          <View style={styles.homeSearchContainer}>
            <View style={styles.homeSearchBar}>
              <Search size={18} color="#999" />
              <TextInput
                style={styles.homeSearchInput}
                value={urlInput}
                onChangeText={setUrlInput}
                onSubmitEditing={() => handleUrlSubmit()}
                placeholder="URL 입력 또는 검색"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
              />
            </View>
          </View>

          {/* Recent Memos */}
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" />
          ) : memos.length > 0 ? (
            <View style={styles.memosSection}>
              <Text style={styles.sectionTitle}>최근 메모</Text>
              <FlatList
                data={memos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <MemoCard
                    memo={item}
                    onPress={() => navigateTo(item.url)}
                  />
                )}
                contentContainerStyle={styles.memosList}
                onRefresh={refetch}
                refreshing={false}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Globe size={48} color="#ddd" />
              <Text style={styles.emptyText}>
                URL을 입력해서 웹서핑을 시작하세요
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─── BROWSER MODE ───
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Browser Header */}
      <View style={styles.browserHeader}>
        <TouchableOpacity onPress={goHome} style={styles.navBtn}>
          <Home size={20} color="#111" />
        </TouchableOpacity>

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
            onSubmitEditing={() => handleUrlSubmit()}
            placeholder="Search or enter URL"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            selectTextOnFocus
          />
        </View>

        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={styles.navBtn}
        >
          <RotateCw size={16} color="#111" />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsBackForwardNavigationGestures
        />
      </View>

      {/* Memo Panel */}
      {isMemoOpen && (
        <Animated.View
          style={[styles.memoContainer, { height: memoPanelHeight }]}
        >
          <MemoPanel url={currentUrl} pageTitle={pageTitle} />
        </Animated.View>
      )}

      {/* Floating Memo Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: insets.bottom + 20 },
          isMemoOpen && styles.fabActive,
        ]}
        onPress={toggleMemo}
        activeOpacity={0.8}
      >
        {isMemoOpen ? (
          <X size={24} color="#fff" />
        ) : (
          <PenLine size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── Memo Card Component ───
function MemoCard({
  memo,
  onPress,
}: {
  memo: LocalMemo;
  onPress: () => void;
}) {
  let domain = "";
  try {
    if (memo.url) domain = new URL(memo.url).hostname.replace("www.", "");
  } catch {}

  return (
    <TouchableOpacity
      style={styles.memoCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.memoCardHeader}>
        <FileText size={14} color="#666" />
        <Text style={styles.memoCardTitle} numberOfLines={1}>
          {memo.title || "Untitled"}
        </Text>
      </View>
      {memo.memo ? (
        <Text style={styles.memoCardText} numberOfLines={2}>
          {memo.memo}
        </Text>
      ) : null}
      {domain ? (
        <View style={styles.memoCardFooter}>
          <Globe size={11} color="#999" />
          <Text style={styles.memoCardDomain}>{domain}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // ─── HOME ───
  homeContent: {
    flex: 1,
  },
  branding: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: "#888",
    marginTop: 6,
  },
  homeSearchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  homeSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  homeSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  memosSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  memosList: {
    paddingBottom: 32,
  },
  memoCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  memoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  memoCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  memoCardText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 6,
  },
  memoCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memoCardDomain: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#bbb",
  },

  // ─── BROWSER ───
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
  navBtn: {
    padding: 6,
  },
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
  browserUrlInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    padding: 0,
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  memoContainer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  fab: {
    position: "absolute",
    right: 20,
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
  fabActive: {
    backgroundColor: "#666",
  },
});
