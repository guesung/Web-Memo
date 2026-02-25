import "../global.css";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { syncMemosToSupabase } from "@/lib/storage/syncService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { useShareIntent } from "expo-share-intent";
import { handleSharedUrl } from "@/lib/sharing/shareHandler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function SyncOnAuth() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      syncMemosToSupabase()
        .then((result) => {
          queryClient.invalidateQueries({ queryKey: ["memos"] });
          queryClient.invalidateQueries({ queryKey: ["localMemos"] });
          if (result.synced > 0) {
            setSyncToast(`${result.synced}개의 메모가 동기화되었습니다`);
            setTimeout(() => setSyncToast(null), 3000);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  if (!syncToast) return null;

  return (
    <View
      className="absolute self-center flex-row items-center gap-2 bg-black/80 px-4 py-2.5 rounded-[20px]"
      style={{ top: insets.top + 60 }}
    >
      <Check size={14} color="#22c55e" />
      <Text className="text-white text-sm font-semibold">{syncToast}</Text>
    </View>
  );
}

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const insets = useSafeAreaInsets();
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl || shareIntent.text;
      if (url && url.startsWith("http")) {
        handleSharedUrl(url)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["memos"] });
            queryClient.invalidateQueries({ queryKey: ["localMemos"] });
            setShareToast("위시리스트에 저장되었습니다");
            setTimeout(() => setShareToast(null), 3000);
          })
          .catch(() => {
            setShareToast("저장에 실패했습니다");
            setTimeout(() => setShareToast(null), 3000);
          })
          .finally(() => {
            resetShareIntent();
          });
      } else {
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  if (!shareToast) return null;

  return (
    <View
      className="absolute self-center flex-row items-center gap-2 bg-black/80 px-4 py-2.5 rounded-[20px]"
      style={{ top: insets.top + 60 }}
    >
      <Check size={14} color="#22c55e" />
      <Text className="text-white text-sm font-semibold">{shareToast}</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GestureHandlerRootView>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        </GestureHandlerRootView>
        <SyncOnAuth />
        <ShareIntentHandler />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
