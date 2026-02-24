import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function AuthLayout() {
	const { session } = useAuth();

	if (session) {
		return <Redirect href="/(main)" />;
	}

	return <Stack screenOptions={{ headerShown: false }} />;
}
