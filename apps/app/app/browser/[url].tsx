import { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import { BrowserHeader } from "@/components/browser/BrowserHeader";
import { MemoPanel } from "@/components/browser/MemoPanel";

export default function BrowserScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(decodeURIComponent(url ?? ""));
  const [pageTitle, setPageTitle] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);
    setPageTitle(navState.title ?? "");
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BrowserHeader
        url={currentUrl}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={() => webViewRef.current?.goBack()}
        onGoForward={() => webViewRef.current?.goForward()}
        onReload={() => webViewRef.current?.reload()}
        onClose={() => router.back()}
      />

      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: decodeURIComponent(url ?? "") }}
          onNavigationStateChange={handleNavigationStateChange}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsBackForwardNavigationGestures
        />
      </View>

      <MemoPanel url={currentUrl} pageTitle={pageTitle} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webviewContainer: {
    flex: 0.65,
  },
  webview: {
    flex: 1,
  },
});
