import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { syncMemosToSupabase } from "@/lib/storage/syncService";

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

  useEffect(() => {
    if (session) {
      syncMemosToSupabase()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["memos"] });
        })
        .catch(() => {});
    }
  }, [session]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        <SyncOnAuth />
        <StatusBar style="auto" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
