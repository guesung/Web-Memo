import { useRouter } from "expo-router";
import { useState } from "react";
import {
	Keyboard,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
	const router = useRouter();
	const [url, setUrl] = useState("");

	function handleOpenUrl() {
		if (!url.trim()) return;

		let normalizedUrl = url.trim();
		if (
			!normalizedUrl.startsWith("http://") &&
			!normalizedUrl.startsWith("https://")
		) {
			normalizedUrl = `https://${normalizedUrl}`;
		}

		Keyboard.dismiss();
		router.push(`/browser/${encodeURIComponent(normalizedUrl)}`);
		setUrl("");
	}

	return (
		<SafeAreaView style={styles.container} edges={["left", "right"]}>
			<View style={styles.content}>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="URL을 입력하세요"
						placeholderTextColor="#999"
						value={url}
						onChangeText={setUrl}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="url"
						returnKeyType="go"
						onSubmitEditing={handleOpenUrl}
					/>
					<Pressable
						style={[
							styles.button,
							!url.trim() && styles.buttonDisabled,
						]}
						onPress={handleOpenUrl}
						disabled={!url.trim()}
					>
						<Text style={styles.buttonText}>열기</Text>
					</Pressable>
				</View>

				<View style={styles.tips}>
					<Text style={styles.tipsTitle}>💡 팁</Text>
					<Text style={styles.tipsText}>
						• URL을 입력하면 인앱 브라우저에서 아티클을 열 수 있어요
					</Text>
					<Text style={styles.tipsText}>
						• 브라우저 하단에서 바로 메모를 작성할 수 있어요
					</Text>
				</View>
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
	inputContainer: {
		flexDirection: "row",
		gap: 8,
	},
	input: {
		flex: 1,
		backgroundColor: "#fff",
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	button: {
		backgroundColor: "#1a1a1a",
		borderRadius: 12,
		paddingHorizontal: 20,
		justifyContent: "center",
	},
	buttonDisabled: {
		backgroundColor: "#ccc",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	tips: {
		marginTop: 32,
		padding: 16,
		backgroundColor: "#fff",
		borderRadius: 12,
	},
	tipsTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 12,
	},
	tipsText: {
		fontSize: 14,
		color: "#666",
		marginBottom: 8,
		lineHeight: 20,
	},
});
