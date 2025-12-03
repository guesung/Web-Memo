import { Tabs, Redirect } from "expo-router";
import { Home, Search, FileText, Settings } from "lucide-react-native";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function TabLayout() {
	const { session, isLoading } = useAuth();

	if (isLoading) {
		return null;
	}

	if (!session) {
		return <Redirect href="/(auth)/login" />;
	}

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: "#1a1a1a",
				tabBarInactiveTintColor: "#999",
				headerShown: true,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "홈",
					tabBarIcon: ({ color, size }) => (
						<Home size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="search"
				options={{
					title: "검색",
					tabBarIcon: ({ color, size }) => (
						<Search size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="memos"
				options={{
					title: "메모",
					tabBarIcon: ({ color, size }) => (
						<FileText size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "설정",
					tabBarIcon: ({ color, size }) => (
						<Settings size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
