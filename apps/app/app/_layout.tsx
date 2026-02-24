import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { syncMemosToSupabase } from "@/lib/storage/syncService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

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
				<GestureHandlerRootView>
					<Stack screenOptions={{ headerShown: false }}>
						<Stack.Screen name="index" />
						<Stack.Screen name="(auth)" />
						<Stack.Screen name="(main)" />
					</Stack>
				</GestureHandlerRootView>
				<SyncOnAuth />
				<StatusBar style="dark" />
			</AuthProvider>
		</QueryClientProvider>
	);
}
