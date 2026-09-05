import { Heart } from "lucide-react-native";
import { useCallback, useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { AISheet } from "./_components/AISheet";
import { BrowserHeader } from "./_components/BrowserHeader";
import { DraggableFab } from "./_components/DraggableFab";
import { EmptyBrowserView } from "./_components/EmptyBrowserView";
import { HighlightEditSheet } from "./_components/HighlightEditSheet";
import { MemoPanel } from "./_components/MemoPanel";
import { PageActionsSheet } from "./_components/PageActionsSheet";
import { TechBlogBottomSheet } from "./_components/TechBlogBottomSheet";
import { useBrowserState } from "./_hooks/useBrowserState";
import {
	useWebViewHighlights,
	type WebViewHighlightMessage,
} from "./_hooks/useWebViewHighlights";
import { INJECTED_JS_ON_LOAD } from "./_utils/webViewScripts";

export default function BrowserScreen() {
	/**
	 * useBrowserState()가 반환하는 webViewRef가 있어야 useWebViewHighlights를 호출할 수
	 * 있는데, useBrowserState() 호출에는 highlights.handleHighlightMessage가 필요해
	 * 같은 렌더 안에서 서로를 먼저 요구한다. ref로 감싼 forwarding 콜백으로 순환을 끊는다.
	 */
	const handleHighlightMessageRef = useRef<
		(message: WebViewHighlightMessage) => void
	>(() => {});

	const forwardHighlightMessage = useCallback(
		(message: WebViewHighlightMessage) => {
			handleHighlightMessageRef.current(message);
		},
		[],
	);

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
		keyboardBottomInset,
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
		handleShouldStartLoadWithRequest,
		handleWebViewMessage,
		handleWishToggle,
		toggleMemo,
		closePanel,
		handleBlogSelect,
		handleShare,
		isSelectionUnlocked,
		handleSelectionUnlockToggle,
		SCROLL_DETECT_JS,
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
	} = useBrowserState({ onHighlightMessage: forwardHighlightMessage });

	const highlights = useWebViewHighlights({ webViewRef });

	useEffect(() => {
		handleHighlightMessageRef.current = highlights.handleHighlightMessage;
	}, [highlights.handleHighlightMessage]);

	const tappedHighlight =
		highlights.tappedHighlightId === null
			? null
			: (highlights.rows.find(
					(row) => row.id === highlights.tappedHighlightId,
				) ?? null);

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

	// 다크 배경은 다른 탭 화면과 같은 neutral-950이어야 한다. 900으로 두면
	// 탭을 오갈 때 배경색이 한 단계 튀어 잔상처럼 보인다.
	return (
		<KeyboardAvoidingView
			className="flex-1 bg-white dark:bg-neutral-950"
			style={{ paddingTop: insets.top, paddingBottom: keyboardBottomInset }}
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
						onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
						injectedJavaScript={INJECTED_JS_ON_LOAD}
						menuItems={highlights.menuItems}
						onCustomMenuSelection={highlights.handleCustomMenuSelection}
						className="flex-1"
						javaScriptEnabled
						domStorageEnabled
						startInLoadingState
						allowsBackForwardNavigationGestures
						// target="_blank" 링크가 외부 브라우저로 빠지지 않고 현재 웹뷰에서 열리도록 한다(Android)
						setSupportMultipleWindows={false}
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

			{highlights.highlightToast ? (
				<View
					className="absolute self-center flex-row items-center gap-1.5 bg-black/80 px-4 py-2.5 rounded-[20px]"
					style={{ bottom: insets.bottom + 84 }}
				>
					<Text className="text-white text-sm font-semibold">
						{highlights.highlightToast}
					</Text>
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
				isSelectionUnlocked={isSelectionUnlocked}
				onSelectionUnlockToggle={handleSelectionUnlockToggle}
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

			<HighlightEditSheet
				highlight={tappedHighlight}
				onClose={highlights.clearTappedHighlight}
				onUpdate={highlights.updateHighlight}
				onDelete={highlights.deleteHighlight}
			/>
		</KeyboardAvoidingView>
	);
}
