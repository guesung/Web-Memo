import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AuthProvider } from "@/lib/auth/AuthProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 2,
		},
	},
});

export default function RootLayout() {
	useEffect(() => {
		SplashScreen.hideAsync();
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(auth)" />
					<Stack.Screen name="(tabs)" />
					<Stack.Screen
						name="browser/[url]"
						options={{
							headerShown: true,
							headerTitle: "",
							presentation: "modal",
						}}
					/>
				</Stack>
				<StatusBar style="auto" />
			</AuthProvider>
		</QueryClientProvider>
	);
}
