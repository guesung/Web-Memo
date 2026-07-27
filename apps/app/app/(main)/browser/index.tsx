import { Heart } from "lucide-react-native";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { AISheet } from "./_components/AISheet";
import { BrowserHeader } from "./_components/BrowserHeader";
import { DraggableFab } from "./_components/DraggableFab";
import { EmptyBrowserView } from "./_components/EmptyBrowserView";
import { MemoPanel } from "./_components/MemoPanel";
import { PageActionsSheet } from "./_components/PageActionsSheet";
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
		isCurrentPageReading,
		isCurrentPageStar,
		isCurrentPageFavorite,
		handleFavoriteToggle,
		handleReadingToggle,
		handleStarToggle,
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
		handleShare,
		SCROLL_DETECT_JS,
		selectedText,
		consumeSelectedText,
		isActionsSheetOpen,
		setIsActionsSheetOpen,
		isAISheetOpen,
		openAISheet,
		closeAISheet,
		aiSummary,
		aiAnswer,
		aiQuestion,
		setAiQuestion,
		isAILoading,
		aiError,
		askAIQuestion,
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

	const hasActiveStatus =
		isCurrentPageFavorite ||
		isCurrentPageReading ||
		isCurrentPageWish ||
		isCurrentPageStar;

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-white dark:bg-neutral-900"
			style={{ paddingTop: insets.top }}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<BrowserHeader
				urlInput={urlInput}
				currentUrl={currentUrl}
				hasActiveStatus={hasActiveStatus}
				headerWrapperStyle={headerWrapperStyle}
				webViewRef={webViewRef}
				onUrlInputChange={setUrlInput}
				onUrlSubmit={handleUrlSubmit}
				onGoHome={() => {
					setUrlInput("");
					handleBlogSelect("");
				}}
				onOpenBlogSheet={() => setIsBlogSheetOpen(true)}
				onOpenActions={() => setIsActionsSheetOpen(true)}
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
					className="border-t border-border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
					style={memoAnimatedStyle}
				>
					<GestureDetector gesture={resizeGesture}>
						<Animated.View className="items-center justify-center py-2">
							<View className="w-9 h-1 rounded-sm bg-gray-300 dark:bg-neutral-700" />
						</Animated.View>
					</GestureDetector>
					<MemoPanel
						url={currentUrl}
						pageTitle={pageTitle}
						favIconUrl={pageFavIconUrl}
						onClose={closePanel}
						selectedText={selectedText}
						onSelectedTextConsumed={consumeSelectedText}
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

			<PageActionsSheet
				visible={isActionsSheetOpen}
				onClose={() => setIsActionsSheetOpen(false)}
				isCurrentPageFavorite={isCurrentPageFavorite}
				isCurrentPageReading={isCurrentPageReading}
				isCurrentPageWish={isCurrentPageWish}
				isCurrentPageStar={isCurrentPageStar}
				onFavoriteToggle={handleFavoriteToggle}
				onReadingToggle={handleReadingToggle}
				onWishToggle={handleWishToggle}
				onStarToggle={handleStarToggle}
				onShare={handleShare}
				onOpenAI={openAISheet}
			/>

			<AISheet
				visible={isAISheetOpen}
				onClose={closeAISheet}
				summary={aiSummary}
				answer={aiAnswer}
				question={aiQuestion}
				onQuestionChange={setAiQuestion}
				onAskQuestion={askAIQuestion}
				isLoading={isAILoading}
				error={aiError}
			/>
		</KeyboardAvoidingView>
	);
}
