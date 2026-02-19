import { useRef, useState, useCallback, useEffect } from "react";
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
  Modal,
  Alert,
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
  CloudUpload,
  LogOut,
  Check,
} from "lucide-react-native";
import * as Linking from "expo-linking";
import { MemoPanel } from "@/components/browser/MemoPanel";
import { useLocalMemos, useSyncMemos } from "@/lib/hooks/useLocalMemos";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useOAuth, createSessionFromUrl } from "@/lib/auth/useOAuth";
import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import type { LocalMemo } from "@/lib/storage/localMemo";

type Mode = "home" | "browser";

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  // Auth
  const { session, signOut } = useAuth();
  const { signInWithGoogle, signInWithKakao } = useOAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Sync
  const { mutate: syncMemos, isPending: isSyncing } = useSyncMemos();
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Mode
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

  // Deep link listener for Kakao OAuth callback (Google uses native sign-in)
  const deepLinkUrl = Linking.useURL();
  useEffect(() => {
    if (deepLinkUrl) {
      createSessionFromUrl(deepLinkUrl).catch(() => {});
    }
  }, [deepLinkUrl]);

  const navigateTo = useCallback(
    (url: string) => {
      setCurrentUrl(url);
      setMode("browser");
      setIsMemoOpen(false);
      slideAnim.setValue(0);
    },
    [slideAnim]
  );

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

  // ─── Sync / Login ───
  const doSync = () => {
    syncMemos(undefined, {
      onSuccess: (result) => {
        setSyncResult(
          result.synced > 0
            ? `${result.synced}개 메모 동기화 완료`
            : "모든 메모가 동기화됨"
        );
        setTimeout(() => setSyncResult(null), 3000);
      },
      onError: () => {
        setSyncResult("동기화 실패");
        setTimeout(() => setSyncResult(null), 3000);
      },
    });
  };

  const handleSyncPress = () => {
    if (!session) {
      setShowLoginModal(true);
      return;
    }
    doSync();
  };

  const handleLogin = async (provider: "google" | "kakao") => {
    try {
      setLoginLoading(true);
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithKakao();
      }
      setShowLoginModal(false);
      setTimeout(() => doSync(), 500);
    } catch (e) {
      console.error("[Login Error]", e);
      Alert.alert("로그인 실패", String(e));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: signOut },
    ]);
  };

  // ─── HOME MODE ───
  if (mode === "home") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.homeContent}>
          {/* Header */}
          <View style={styles.homeHeader}>
            <Text style={styles.brandTitle}>Web Memo</Text>
            <View style={styles.homeHeaderRight}>
              {session && (
                <TouchableOpacity onPress={handleSignOut} style={styles.headerBtn}>
                  <LogOut size={18} color="#999" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSyncPress}
                disabled={isSyncing}
                style={[styles.syncButton, session && styles.syncButtonLoggedIn]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={session ? "#fff" : "#111"} />
                ) : syncResult ? (
                  <>
                    <Check size={14} color={session ? "#fff" : "#22c55e"} />
                    <Text style={[styles.syncText, session && styles.syncTextLoggedIn]}>
                      {syncResult}
                    </Text>
                  </>
                ) : (
                  <>
                    <CloudUpload size={14} color={session ? "#fff" : "#111"} />
                    <Text style={[styles.syncText, session && styles.syncTextLoggedIn]}>
                      {session ? "동기화" : "로그인"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.brandSubtitle}>웹서핑하며 메모하세요</Text>

          {/* URL Bar */}
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

          {/* Memos */}
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" />
          ) : memos.length > 0 ? (
            <View style={styles.memosSection}>
              <Text style={styles.sectionTitle}>최근 메모</Text>
              <FlatList
                data={memos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <MemoCard memo={item} onPress={() => navigateTo(item.url)} />
                )}
                contentContainerStyle={styles.memosList}
                onRefresh={refetch}
                refreshing={false}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Globe size={48} color="#ddd" />
              <Text style={styles.emptyText}>URL을 입력해서 웹서핑을 시작하세요</Text>
            </View>
          )}
        </View>

        <Modal
          visible={showLoginModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLoginModal(false)}
        >
          <View style={styles.loginModal}>
            <View style={styles.loginModalHeader}>
              <TouchableOpacity onPress={() => setShowLoginModal(false)}>
                <X size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <View style={styles.loginModalContent}>
              <CloudUpload size={48} color="#111" />
              <Text style={styles.loginTitle}>메모를 웹에서도 확인하세요</Text>
              <Text style={styles.loginSubtitle}>
                로그인하면 메모가 자동으로 동기화되어{"\n"}
                웹에서도 볼 수 있습니다
              </Text>
              <View style={styles.loginButtons}>
                <SocialLoginButton
                  provider="google"
                  onPress={() => handleLogin("google")}
                  disabled={loginLoading}
                />
                <SocialLoginButton
                  provider="kakao"
                  onPress={() => handleLogin("kakao")}
                  disabled={loginLoading}
                />
                {loginLoading && <ActivityIndicator size="small" style={{ marginTop: 12 }} />}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── BROWSER MODE ───
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
        <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.navBtn}>
          <RotateCw size={16} color="#111" />
        </TouchableOpacity>
      </View>

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

      {isMemoOpen && (
        <Animated.View style={[styles.memoContainer, { height: memoPanelHeight }]}>
          <MemoPanel url={currentUrl} pageTitle={pageTitle} />
        </Animated.View>
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }, isMemoOpen && styles.fabActive]}
        onPress={toggleMemo}
        activeOpacity={0.8}
      >
        {isMemoOpen ? <X size={24} color="#fff" /> : <PenLine size={24} color="#fff" />}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function MemoCard({ memo, onPress }: { memo: LocalMemo; onPress: () => void }) {
  let domain = "";
  try {
    if (memo.url) domain = new URL(memo.url).hostname.replace("www.", "");
  } catch {}

  return (
    <TouchableOpacity style={styles.memoCard} onPress={onPress} activeOpacity={0.7}>
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
  container: { flex: 1, backgroundColor: "#fff" },

  // HOME
  homeContent: { flex: 1 },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  homeHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { padding: 8 },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  syncButtonLoggedIn: { backgroundColor: "#111", borderColor: "#111" },
  syncText: { fontSize: 13, fontWeight: "600", color: "#111" },
  syncTextLoggedIn: { color: "#fff" },
  brandTitle: { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 14, color: "#888", paddingHorizontal: 20, marginBottom: 16 },
  homeSearchContainer: { paddingHorizontal: 20, marginBottom: 24 },
  homeSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  homeSearchInput: { flex: 1, fontSize: 16, color: "#333", padding: 0 },
  memosSection: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 12 },
  memosList: { paddingBottom: 32 },
  memoCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  memoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  memoCardTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111" },
  memoCardText: { fontSize: 14, color: "#555", lineHeight: 20, marginBottom: 6 },
  memoCardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  memoCardDomain: { fontSize: 12, color: "#999" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#bbb" },

  // LOGIN MODAL
  loginModal: { flex: 1, backgroundColor: "#fff" },
  loginModalHeader: { flexDirection: "row", justifyContent: "flex-end", padding: 16 },
  loginModalContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 12,
  },
  loginTitle: { fontSize: 22, fontWeight: "700", color: "#111", marginTop: 16 },
  loginSubtitle: { fontSize: 15, color: "#888", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  loginButtons: { width: "100%", gap: 12 },

  // BROWSER
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
  webviewContainer: { flex: 1 },
  webview: { flex: 1 },
  memoContainer: { borderTopWidth: 1, borderTopColor: "#eee", backgroundColor: "#fff" },
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
  fabActive: { backgroundColor: "#666" },
});
