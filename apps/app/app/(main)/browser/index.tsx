import { Heart } from "lucide-react-native";
import {
	KeyboardAvoidingView,
	Platform,
	Text,
	View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { BrowserHeader } from "./_components/BrowserHeader";
import { DraggableFab } from "./_components/DraggableFab";
import { EmptyBrowserView } from "./_components/EmptyBrowserView";
import { MemoPanel } from "./_components/MemoPanel";
import { TechBlogBottomSheet } from "./_components/TechBlogBottomSheet";
import { useBrowserState } from "./_hooks/useBrowserState";

export default function BrowserScreen() {
	const {
		insets,
		webViewRef,
		currentUrl,
		urlInput,
		setUrlInput,
		isMemoOpen,
		isBlogSheetOpen,
		setIsBlogSheetOpen,
		setContentHeight,
		wishToast,
		pageTitle,
		pageFavIconUrl,
		isCurrentPageWish,
		panelHeight,
		headerWrapperStyle,
		memoAnimatedStyle,
		resizeGesture,
		handleUrlSubmit,
		handleNavigationStateChange,
		handleWebViewMessage,
		handleWishToggle,
		toggleMemo,
		closePanel,
		handleBlogSelect,
		SCROLL_DETECT_JS,
	} = useBrowserState();

	if (!currentUrl) {
		return (
			<EmptyBrowserView
				insets={insets}
				urlInput={urlInput}
				onUrlInputChange={setUrlInput}
				onUrlSubmit={handleUrlSubmit}
				onSelectBlog={handleBlogSelect}
			/>
		);
	}

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-white"
			style={{ paddingTop: insets.top }}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<BrowserHeader
				urlInput={urlInput}
				currentUrl={currentUrl}
				isCurrentPageWish={isCurrentPageWish}
				headerWrapperStyle={headerWrapperStyle}
				webViewRef={webViewRef}
				onUrlInputChange={setUrlInput}
				onUrlSubmit={handleUrlSubmit}
				onGoHome={() => {
					setUrlInput("");
					handleBlogSelect("");
				}}
				onOpenBlogSheet={() => setIsBlogSheetOpen(true)}
				onWishToggle={handleWishToggle}
			/>

			<View
				className="flex-1"
				onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
			>
				<View className="flex-1">
					<WebView
						ref={webViewRef}
						source={{ uri: currentUrl }}
						onNavigationStateChange={handleNavigationStateChange}
						onMessage={handleWebViewMessage}
						injectedJavaScript={SCROLL_DETECT_JS}
						className="flex-1"
						javaScriptEnabled
						domStorageEnabled
						startInLoadingState
						allowsBackForwardNavigationGestures
					/>
				</View>

				<Animated.View
					className="border-t border-border bg-white overflow-hidden"
					style={memoAnimatedStyle}
				>
					<GestureDetector gesture={resizeGesture}>
						<Animated.View className="items-center justify-center py-2">
							<View className="w-9 h-1 rounded-sm bg-gray-300" />
						</Animated.View>
					</GestureDetector>
					<MemoPanel
						url={currentUrl}
						pageTitle={pageTitle}
						favIconUrl={pageFavIconUrl}
						onClose={closePanel}
					/>
				</Animated.View>
			</View>

			{!isMemoOpen && (
				<DraggableFab
					onPress={toggleMemo}
					panelHeight={panelHeight}
					bottomInset={insets.bottom}
				/>
			)}

			{wishToast ? (
				<View
					className="absolute self-center flex-row items-center gap-1.5 bg-black/80 px-4 py-2.5 rounded-[20px]"
					style={{ bottom: insets.bottom + 84 }}
				>
					<Heart size={14} fill="#ec4899" color="#ec4899" />
					<Text className="text-white text-sm font-semibold">{wishToast}</Text>
				</View>
			) : null}

			<TechBlogBottomSheet
				visible={isBlogSheetOpen}
				onClose={() => setIsBlogSheetOpen(false)}
				onSelectBlog={(url) => {
					setIsBlogSheetOpen(false);
					handleBlogSelect(url);
				}}
			/>
		</KeyboardAvoidingView>
	);
}
