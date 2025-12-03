import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { WEBAPP_URL } from "@/constants/config";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MemosScreen() {
	const { session } = useAuth();

	const webviewUrl = `${WEBAPP_URL}/memos?access_token=${session?.access_token}`;

	return (
		<SafeAreaView style={styles.container} edges={["left", "right"]}>
			<View style={styles.webviewContainer}>
				<WebView
					source={{ uri: webviewUrl }}
					style={styles.webview}
					startInLoadingState
					javaScriptEnabled
				/>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	webviewContainer: {
		flex: 1,
	},
	webview: {
		flex: 1,
	},
});
