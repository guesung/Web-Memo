import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function SettingsScreen() {
	const { session, signOut } = useAuth();

	function handleSignOut() {
		Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
			{ text: "취소", style: "cancel" },
			{ text: "로그아웃", style: "destructive", onPress: signOut },
		]);
	}

	return (
		<SafeAreaView style={styles.container} edges={["left", "right"]}>
			<View style={styles.content}>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>계정</Text>
					<View style={styles.card}>
						<Text style={styles.label}>이메일</Text>
						<Text style={styles.value}>
							{session?.user?.email ?? "-"}
						</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>앱 정보</Text>
					<View style={styles.card}>
						<View style={styles.row}>
							<Text style={styles.label}>버전</Text>
							<Text style={styles.value}>1.0.0</Text>
						</View>
					</View>
				</View>

				<Pressable style={styles.signOutButton} onPress={handleSignOut}>
					<Text style={styles.signOutText}>로그아웃</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	content: {
		flex: 1,
		padding: 16,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#666",
		marginBottom: 8,
		marginLeft: 4,
	},
	card: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	label: {
		fontSize: 16,
		color: "#1a1a1a",
	},
	value: {
		fontSize: 14,
		color: "#666",
		marginTop: 4,
	},
	signOutButton: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
		marginTop: "auto",
	},
	signOutText: {
		fontSize: 16,
		color: "#ff3b30",
		fontWeight: "600",
	},
});
