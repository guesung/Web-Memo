import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function AuthLayout() {
	const { session, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (session) {
		return <Redirect href="/(tabs)" />;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="login" />
		</Stack>
	);
}
