import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import { ChevronLeft, ChevronRight, RefreshCw, X, Send } from "lucide-react-native";

import { useMemoMutation } from "@/lib/hooks/useMemoMutation";

export default function BrowserScreen() {
	const { url } = useLocalSearchParams<{ url: string }>();
	const router = useRouter();
	const webViewRef = useRef<WebView>(null);

	const [currentUrl, setCurrentUrl] = useState(decodeURIComponent(url ?? ""));
	const [canGoBack, setCanGoBack] = useState(false);
	const [canGoForward, setCanGoForward] = useState(false);
	const [pageTitle, setPageTitle] = useState("");

	const [memoText, setMemoText] = useState("");
	const { mutate: saveMemo, isPending: isSaving } = useMemoMutation();

	function handleNavigationStateChange(navState: WebViewNavigation) {
		setCanGoBack(navState.canGoBack);
		setCanGoForward(navState.canGoForward);
		setCurrentUrl(navState.url);
		if (navState.title) {
			setPageTitle(navState.title);
		}
	}

	function handleSaveMemo() {
		if (!memoText.trim()) return;

		saveMemo(
			{
				url: currentUrl,
				title: pageTitle,
				content: memoText.trim(),
			},
			{
				onSuccess: () => {
					setMemoText("");
				},
			}
		);
	}

	function handleClose() {
		router.back();
	}

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<KeyboardAvoidingView
				style={styles.keyboardAvoid}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				{/* Browser Header */}
				<View style={styles.header}>
					<Pressable onPress={handleClose} style={styles.headerButton}>
						<X size={24} color="#1a1a1a" />
					</Pressable>
					<View style={styles.urlContainer}>
						<Text style={styles.urlText} numberOfLines={1}>
							{currentUrl}
						</Text>
					</View>
					<View style={styles.navButtons}>
						<Pressable
							onPress={() => webViewRef.current?.goBack()}
							disabled={!canGoBack}
							style={styles.headerButton}
						>
							<ChevronLeft
								size={24}
								color={canGoBack ? "#1a1a1a" : "#ccc"}
							/>
						</Pressable>
						<Pressable
							onPress={() => webViewRef.current?.goForward()}
							disabled={!canGoForward}
							style={styles.headerButton}
						>
							<ChevronRight
								size={24}
								color={canGoForward ? "#1a1a1a" : "#ccc"}
							/>
						</Pressable>
						<Pressable
							onPress={() => webViewRef.current?.reload()}
							style={styles.headerButton}
						>
							<RefreshCw size={20} color="#1a1a1a" />
						</Pressable>
					</View>
				</View>

				{/* WebView - 70% */}
				<View style={styles.webviewContainer}>
					<WebView
						ref={webViewRef}
						source={{ uri: decodeURIComponent(url ?? "") }}
						style={styles.webview}
						onNavigationStateChange={handleNavigationStateChange}
						startInLoadingState
						javaScriptEnabled
						domStorageEnabled
					/>
				</View>

				{/* Memo Panel - 30% */}
				<View style={styles.memoPanel}>
					<View style={styles.memoPanelHeader}>
						<Text style={styles.memoPanelTitle}>메모</Text>
						{pageTitle ? (
							<Text style={styles.pageTitle} numberOfLines={1}>
								{pageTitle}
							</Text>
						) : null}
					</View>
					<View style={styles.memoInputContainer}>
						<TextInput
							style={styles.memoInput}
							placeholder="이 페이지에 대한 메모를 작성하세요..."
							placeholderTextColor="#999"
							value={memoText}
							onChangeText={setMemoText}
							multiline
							textAlignVertical="top"
						/>
						<Pressable
							style={[
								styles.sendButton,
								(!memoText.trim() || isSaving) &&
									styles.sendButtonDisabled,
							]}
							onPress={handleSaveMemo}
							disabled={!memoText.trim() || isSaving}
						>
							<Send
								size={20}
								color={
									!memoText.trim() || isSaving
										? "#ccc"
										: "#1a1a1a"
								}
							/>
						</Pressable>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	keyboardAvoid: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
		backgroundColor: "#fff",
	},
	headerButton: {
		padding: 8,
	},
	urlContainer: {
		flex: 1,
		backgroundColor: "#f5f5f5",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginHorizontal: 8,
	},
	urlText: {
		fontSize: 14,
		color: "#666",
	},
	navButtons: {
		flexDirection: "row",
	},
	webviewContainer: {
		flex: 0.7,
	},
	webview: {
		flex: 1,
	},
	memoPanel: {
		flex: 0.3,
		borderTopWidth: 1,
		borderTopColor: "#e0e0e0",
		backgroundColor: "#fafafa",
	},
	memoPanelHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	memoPanelTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#1a1a1a",
	},
	pageTitle: {
		fontSize: 12,
		color: "#666",
		marginTop: 4,
	},
	memoInputContainer: {
		flex: 1,
		flexDirection: "row",
		padding: 12,
	},
	memoInput: {
		flex: 1,
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 12,
		fontSize: 15,
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	sendButton: {
		padding: 12,
		justifyContent: "center",
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
});
