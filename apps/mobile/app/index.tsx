import { Redirect } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function Index() {
	const { session, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (session) {
		return <Redirect href="/(tabs)" />;
	}

	return <Redirect href="/(auth)/login" />;
}
