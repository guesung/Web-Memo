import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { useOAuth } from "@/lib/auth/useOAuth";

export default function LoginScreen() {
	const { signInWithGoogle, signInWithApple, signInWithKakao, isLoading } =
		useOAuth();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<View style={styles.header}>
					<Text style={styles.title}>WebMemo</Text>
					<Text style={styles.subtitle}>
						아티클을 읽으며 메모하세요
					</Text>
				</View>

				<View style={styles.buttons}>
					<SocialLoginButton
						provider="google"
						onPress={signInWithGoogle}
						disabled={isLoading}
					/>
					<SocialLoginButton
						provider="apple"
						onPress={signInWithApple}
						disabled={isLoading}
					/>
					<SocialLoginButton
						provider="kakao"
						onPress={signInWithKakao}
						disabled={isLoading}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	content: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	header: {
		alignItems: "center",
		marginBottom: 48,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#1a1a1a",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
	},
	buttons: {
		gap: 12,
	},
});
