import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type WebView from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBrowserScroll } from "@/lib/context/BrowserScrollContext";
import { useFavoriteToggle, useIsFavorite } from "@/lib/hooks/useFavorites";
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight";
import {
	useLocalMemoByUrl,
	useLocalMemoDelete,
	useLocalMemoReadingToggle,
	useLocalMemoStarToggle,
	useLocalMemoWishToggle,
} from "@/lib/hooks/useLocalMemos";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import {
	useDeleteMemoMutation,
	useMemoReadingToggleMutation,
	useMemoStarToggleMutation,
	useMemoWishToggleMutation,
} from "@/lib/hooks/useMemoMutation";
import { SCROLL_POSITIONS_QUERY_KEY } from "@/lib/hooks/useScrollPositions";
import { shareUrl } from "@/lib/sharing/shareUrl";
import {
	getScrollPosition,
	saveScrollPosition,
} from "@/lib/storage/scrollPositions";
import { supabase } from "@/lib/supabase/client";
import { WEB_API_ORIGIN } from "../_constants/webApi";
import {
	addUnlockedDomain,
	getPanelRatio,
	getUnlockedDomains,
	removeUnlockedDomain,
	savePanelRatio,
} from "../_utils/browserPreferences";
import { formatUrl } from "../_utils/formatUrl";
import {
	isInAppLoadableUrl,
	openExternalUrl,
} from "../_utils/webViewNavigation";
import {
	EXTRACT_PAGE_TEXT_JS,
	INJECTED_JS_ON_NAVIGATION,
	SCROLL_DETECT_JS,
	UNLOCK_SELECTION_JS,
} from "../_utils/webViewScripts";
import { useAndroidWebViewBack } from "./useAndroidWebViewBack";

const SPRING_CONFIG = { damping: 20, stiffness: 150 };
const MIN_PANEL_RATIO = 0.15;
const MAX_PANEL_RATIO = 0.8;
const DEFAULT_PANEL_RATIO = 0.4;
const HEADER_HEIGHT = 44;
const TAB_BAR_HEIGHT = 60;
const HIDE_DURATION = 250;

export function useBrowserState({
	onHighlightMessage,
}: {
	/** 하이라이트 메시지(`highlight:` 접두사)를 상위(useWebViewHighlights)로 위임한다 */
	onHighlightMessage?: (message: {
		type: string;
		[key: string]: unknown;
	}) => void;
} = {}) {
	const insets = useSafeAreaInsets();
	const webViewRef = useRef<WebView>(null);
	const { url: paramUrl, t: navTs } = useLocalSearchParams<{
		url?: string;
		t?: string;
	}>();

	const [currentUrl, setCurrentUrl] = useState("");
	const [pageTitle, setPageTitle] = useState("");
	const [pageFavIconUrl, setPageFavIconUrl] = useState<string | undefined>(
		undefined,
	);
	const [urlInput, setUrlInput] = useState("");
	const [isMemoOpen, setIsMemoOpen] = useState(false);
	const [isBlogSheetOpen, setIsBlogSheetOpen] = useState(false);
	const [contentHeight, setContentHeight] = useState(0);
	const [wishToast, setWishToast] = useState<string | null>(null);
	const [savedRatio, setSavedRatio] = useState(DEFAULT_PANEL_RATIO);
	const [isActionsSheetOpen, setIsActionsSheetOpen] = useState(false);
	const [isAISheetOpen, setIsAISheetOpen] = useState(false);
	const [aiPageText, setAiPageText] = useState("");
	const [aiSummary, setAiSummary] = useState<string | null>(null);
	const [aiAnswer, setAiAnswer] = useState<string | null>(null);
	const [aiQuestion, setAiQuestion] = useState("");
	const [isAILoading, setIsAILoading] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);
	const [unlockedDomains, setUnlockedDomains] = useState<string[]>([]);

	const { isLoggedIn } = useAuth();
	const queryClient = useQueryClient();

	// 읽기 위치 저장/복원용 ref (스크롤 메시지는 stale closure를 피하려 ref로 현재 URL 참조)
	const currentUrlRef = useRef("");
	currentUrlRef.current = currentUrl;
	const restoredUrlRef = useRef<string | null>(null);
	const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingScrollRef = useRef<{
		url: string;
		scrollY: number;
		maxY: number;
	} | null>(null);

	const { data: supabaseMemo } = useSupabaseMemoByUrl(currentUrl, isLoggedIn);
	const { data: localMemo } = useLocalMemoByUrl(currentUrl);
	const wishToggleSupabase = useMemoWishToggleMutation();
	const wishToggleLocal = useLocalMemoWishToggle();
	const readingToggleSupabase = useMemoReadingToggleMutation();
	const readingToggleLocal = useLocalMemoReadingToggle();
	const starToggleSupabase = useMemoStarToggleMutation();
	const starToggleLocal = useLocalMemoStarToggle();
	const deleteSupabaseMemo = useDeleteMemoMutation();
	const deleteLocalMemo = useLocalMemoDelete();

	const isCurrentPageWish = isLoggedIn
		? (supabaseMemo?.isWish ?? false)
		: (localMemo?.isWish ?? false);

	const isCurrentPageReading = isLoggedIn
		? (supabaseMemo?.isReading ?? false)
		: (localMemo?.isReading ?? false);

	const isCurrentPageStar = isLoggedIn
		? (supabaseMemo?.isStar ?? false)
		: (localMemo?.isStar ?? false);

	const { data: isCurrentPageFavorite } = useIsFavorite(currentUrl);
	const favoriteToggle = useFavoriteToggle();

	const panelHeight = useSharedValue(0);
	const dragStartHeight = useSharedValue(0);

	const { keyboardHeight } = useKeyboardHeight();

	// iOS는 KeyboardAvoidingView가 키보드만큼 화면을 밀어 올리지만,
	// Android는 edge-to-edge에서 창이 리사이즈되지 않아 그 동작이 먹지 않는다.
	// 키보드 높이(내비게이션 바 제외)에 하단 인셋을 더해 직접 여백을 만든다.
	const keyboardBottomInset =
		Platform.OS === "android" && keyboardHeight > 0
			? keyboardHeight + insets.bottom
			: 0;

	const { tabBarTranslateY, headerTranslateY, isBrowserActive } =
		useBrowserScroll();

	const { syncCanGoBack } = useAndroidWebViewBack({ webViewRef });

	useEffect(() => {
		getPanelRatio().then((ratio) => {
			if (ratio !== null) setSavedRatio(ratio);
		});
	}, []);

	useEffect(() => {
		getUnlockedDomains().then(setUnlockedDomains);
	}, []);

	useFocusEffect(
		useCallback(() => {
			isBrowserActive.value = 1;
			return () => {
				isBrowserActive.value = 0;
				tabBarTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
				headerTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
			};
		}, [isBrowserActive, tabBarTranslateY, headerTranslateY]),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: navTs는 동일 url 재진입 시에도 effect를 재실행시키기 위한 네비게이션 nonce
	useEffect(() => {
		if (!paramUrl) return;
		const decoded = decodeURIComponent(paramUrl);
		setCurrentUrl(decoded);
		setPageTitle("");
		setIsMemoOpen(false);
		panelHeight.value = withSpring(0, SPRING_CONFIG);
	}, [paramUrl, navTs, panelHeight]);

	const handleNavigationStateChange = (navState: WebViewNavigation) => {
		syncCanGoBack(navState.canGoBack);
		setCurrentUrl(navState.url);
		setPageTitle(navState.title ?? "");
		setPageFavIconUrl(undefined);
		try {
			const parsed = new URL(navState.url);
			setUrlInput(parsed.hostname.replace("www.", ""));
		} catch {
			setUrlInput(navState.url);
		}

		if (navState.loading === false) {
			webViewRef.current?.injectJavaScript(INJECTED_JS_ON_NAVIGATION);

			// 해제해 둔 도메인은 사용자가 다시 누르지 않아도 풀려 있어야 한다.
			if (isDomainUnlocked(navState.url, unlockedDomains)) {
				webViewRef.current?.injectJavaScript(UNLOCK_SELECTION_JS);
			}

			if (restoredUrlRef.current !== navState.url) {
				restoredUrlRef.current = navState.url;
				restoreScrollPosition(navState.url);
			}
		}
	};

	/** 저장된 읽기 위치가 있으면 해당 위치로 스크롤을 복원한다 */
	const restoreScrollPosition = async (url: string): Promise<void> => {
		const saved = await getScrollPosition(url);
		if (!saved || saved.scrollY <= 0) {
			return;
		}

		// ponytail: 로드 직후 레이아웃이 늦게 잡히는 페이지 대비 지연 1회 복원, 부족하면 재시도 로직 추가
		webViewRef.current?.injectJavaScript(
			`setTimeout(function() { window.scrollTo(0, ${Math.round(saved.scrollY)}); }, 300); true;`,
		);
	};

	/** 스크롤 위치를 스로틀 저장하고 '읽는 중' 배지 쿼리를 갱신한다 */
	const persistScrollPosition = useCallback(
		(scrollY: number, maxY: number): void => {
			const url = currentUrlRef.current;
			if (!url) {
				return;
			}

			pendingScrollRef.current = { url, scrollY, maxY };
			if (scrollSaveTimerRef.current) {
				return;
			}

			scrollSaveTimerRef.current = setTimeout(async () => {
				scrollSaveTimerRef.current = null;
				const pending = pendingScrollRef.current;
				if (!pending) {
					return;
				}

				const progress =
					pending.maxY > 0 ? Math.min(1, pending.scrollY / pending.maxY) : 1;
				await saveScrollPosition({
					url: pending.url,
					scrollY: pending.scrollY,
					progress,
				});
				queryClient.invalidateQueries({
					queryKey: SCROLL_POSITIONS_QUERY_KEY,
				});
			}, 1000);
		},
		[queryClient],
	);

	useEffect(() => {
		return () => {
			if (scrollSaveTimerRef.current) {
				clearTimeout(scrollSaveTimerRef.current);
			}
		};
	}, []);

	// 웹 링크는 앱 내 웹뷰에서 그대로 로드하고, 앱을 여는 스킴(intent://, market://, tel: 등)만 외부로 넘긴다.
	const handleShouldStartLoadWithRequest = useCallback(
		(request: ShouldStartLoadRequest) => {
			if (isInAppLoadableUrl(request.url)) return true;

			const openExternalWithFallback = async () => {
				const fallbackUrl = await openExternalUrl(request.url);
				if (fallbackUrl) setCurrentUrl(fallbackUrl);
			};
			openExternalWithFallback();

			return false;
		},
		[],
	);

	const handleUrlSubmit = () => {
		const url = formatUrl(urlInput);
		if (!url) return;
		Keyboard.dismiss();
		setCurrentUrl(url);
		setPageTitle("");
		if (isMemoOpen) {
			setIsMemoOpen(false);
			panelHeight.value = withSpring(0, SPRING_CONFIG);
		}
	};

	const handleFavoriteToggle = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		favoriteToggle.mutate({
			url: currentUrl,
			title: pageTitle,
			favIconUrl: pageFavIconUrl,
			currentIsFavorite: !!isCurrentPageFavorite,
		});
	}, [
		currentUrl,
		pageTitle,
		pageFavIconUrl,
		isCurrentPageFavorite,
		favoriteToggle,
	]);

	const handleReadingToggle = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (isLoggedIn) {
			readingToggleSupabase.mutate({
				url: currentUrl,
				title: pageTitle,
				favIconUrl: pageFavIconUrl,
				currentIsReading: isCurrentPageReading,
			});
		} else {
			readingToggleLocal.mutate({
				url: currentUrl,
				title: pageTitle,
				favIconUrl: pageFavIconUrl,
			});
		}
	}, [
		currentUrl,
		pageTitle,
		pageFavIconUrl,
		isLoggedIn,
		isCurrentPageReading,
		readingToggleSupabase,
		readingToggleLocal,
	]);

	const handleStarToggle = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (isLoggedIn) {
			starToggleSupabase.mutate({
				url: currentUrl,
				title: pageTitle,
				favIconUrl: pageFavIconUrl,
				currentIsStar: isCurrentPageStar,
			});
		} else {
			starToggleLocal.mutate({
				url: currentUrl,
				title: pageTitle,
				favIconUrl: pageFavIconUrl,
			});
		}
	}, [
		currentUrl,
		pageTitle,
		pageFavIconUrl,
		isLoggedIn,
		isCurrentPageStar,
		starToggleSupabase,
		starToggleLocal,
	]);

	const handleWishToggle = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		// 위시리스트를 취소할 때, 작성된 메모가 없고 별표(중요)도 아니면 메모 레코드를 삭제한다.
		// 별표만 켜진 빈 메모는 삭제하면 중요 표시가 유실되므로 위시 플래그만 해제한다.
		const currentMemo = isLoggedIn ? supabaseMemo : localMemo;
		const shouldDeleteEmptyMemo =
			isCurrentPageWish &&
			!currentMemo?.memo?.trim() &&
			!currentMemo?.impression?.trim() &&
			!currentMemo?.actionItem?.trim() &&
			!currentMemo?.isStar;

		const wishToastMessage = isCurrentPageWish
			? "위시리스트에서 제거"
			: "위시리스트에 추가";

		const showWishToast = (message: string) => {
			setWishToast(message);
			setTimeout(() => setWishToast(null), 1500);
		};

		// mutation 결과에 따라 토스트를 띄운다(실패 시 성공 토스트가 뜨지 않도록)
		const wishMutationCallbacks = {
			onSuccess: () => showWishToast(wishToastMessage),
			onError: () => showWishToast("처리에 실패했어요"),
		};

		if (isLoggedIn) {
			if (shouldDeleteEmptyMemo && supabaseMemo) {
				deleteSupabaseMemo.mutate(supabaseMemo.id, wishMutationCallbacks);
			} else {
				wishToggleSupabase.mutate(
					{
						url: currentUrl,
						title: pageTitle,
						favIconUrl: pageFavIconUrl,
						currentIsWish: isCurrentPageWish,
					},
					wishMutationCallbacks,
				);
			}
		} else {
			if (shouldDeleteEmptyMemo && localMemo) {
				deleteLocalMemo.mutate(localMemo.id, wishMutationCallbacks);
			} else {
				wishToggleLocal.mutate(
					{
						url: currentUrl,
						title: pageTitle,
						favIconUrl: pageFavIconUrl,
					},
					wishMutationCallbacks,
				);
			}
		}
	}, [
		currentUrl,
		pageTitle,
		pageFavIconUrl,
		isLoggedIn,
		isCurrentPageWish,
		supabaseMemo,
		localMemo,
		wishToggleSupabase,
		wishToggleLocal,
		deleteSupabaseMemo,
		deleteLocalMemo,
	]);

	const openPanel = useCallback(() => {
		if (isMemoOpen || contentHeight <= 0) return;
		setIsMemoOpen(true);
		const defaultH = contentHeight * savedRatio;
		panelHeight.value = withSpring(defaultH, SPRING_CONFIG);
	}, [isMemoOpen, contentHeight, panelHeight, savedRatio]);

	const closePanel = useCallback(() => {
		if (!isMemoOpen) return;
		setIsMemoOpen(false);
		panelHeight.value = withSpring(0, SPRING_CONFIG);
		Keyboard.dismiss();
	}, [isMemoOpen, panelHeight]);

	const handleScrollMessage = useCallback(
		(direction: string, scrollY: number) => {
			if (isMemoOpen) return;
			// 최하단 여유 구간: 바운스로 인한 헤더/탭바 토글 버벅임 방지를 위해 상태 유지
			if (direction === "bottom") return;
			if (direction === "down") {
				headerTranslateY.value = withTiming(-HEADER_HEIGHT, {
					duration: HIDE_DURATION,
				});
				tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT + insets.bottom, {
					duration: HIDE_DURATION,
				});
			} else if (direction === "up" || direction === "top" || scrollY < 10) {
				headerTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
				tabBarTranslateY.value = withTiming(0, { duration: HIDE_DURATION });
			}
		},
		[isMemoOpen, headerTranslateY, tabBarTranslateY, insets.bottom],
	);

	/** 기사 본문을 요약(question 없음) 또는 질의응답(question 있음) API에 요청한다 */
	const requestArticleAI = useCallback(
		async (pageText: string, question?: string) => {
			setIsAILoading(true);
			setAiError(null);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const response = await fetch(
					`${WEB_API_ORIGIN}/api/openai/webpage-qa`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(session?.access_token
								? { Authorization: `Bearer ${session.access_token}` }
								: {}),
						},
						body: JSON.stringify({ content: pageText, question }),
					},
				);
				const data = await response.json();
				if (!response.ok) {
					setAiError(data.error ?? "요청에 실패했어요");
					return;
				}
				if (question) {
					setAiAnswer(data.answer ?? null);
				} else {
					setAiSummary(data.summary ?? null);
				}
			} catch {
				setAiError("요청에 실패했어요");
			} finally {
				setIsAILoading(false);
			}
		},
		[],
	);

	const handleWebViewMessage = useCallback(
		(event: { nativeEvent: { data: string } }) => {
			try {
				const message = JSON.parse(event.nativeEvent.data);
				if (message.type === "favicon" && message.url) {
					setPageFavIconUrl(message.url);
				} else if (message.type === "scroll") {
					persistScrollPosition(message.scrollY, message.maxY ?? 0);
					handleScrollMessage(message.direction, message.scrollY);
				} else if (message.type === "pageTextExtracted") {
					const text = message.text ?? "";
					setAiPageText(text);
					if (text.trim()) {
						requestArticleAI(text);
					} else {
						setAiError("페이지에서 본문을 찾지 못했어요");
						setIsAILoading(false);
					}
				} else if (
					typeof message.type === "string" &&
					message.type.startsWith("highlight:")
				) {
					onHighlightMessage?.(message);
				}
			} catch {}
		},
		[
			handleScrollMessage,
			persistScrollPosition,
			requestArticleAI,
			onHighlightMessage,
		],
	);

	const openAISheet = useCallback(() => {
		setIsAISheetOpen(true);
		setAiSummary(null);
		setAiAnswer(null);
		setAiQuestion("");
		setAiError(null);
		setIsAILoading(true);
		webViewRef.current?.injectJavaScript(EXTRACT_PAGE_TEXT_JS);
	}, []);

	const closeAISheet = useCallback(() => {
		setIsAISheetOpen(false);
	}, []);

	const askAIQuestion = useCallback(() => {
		if (!aiQuestion.trim() || !aiPageText) return;
		setAiAnswer(null);
		requestArticleAI(aiPageText, aiQuestion.trim());
	}, [aiQuestion, aiPageText, requestArticleAI]);

	const toggleMemo = useCallback(() => {
		if (isMemoOpen) {
			closePanel();
		} else {
			openPanel();
		}
	}, [isMemoOpen, closePanel, openPanel]);

	const persistRatio = useCallback((ratio: number) => {
		setSavedRatio(ratio);
		savePanelRatio(ratio);
	}, []);

	const resizeGesture = Gesture.Pan()
		.onStart(() => {
			dragStartHeight.value = panelHeight.value;
		})
		.onUpdate((event) => {
			const newHeight = dragStartHeight.value - event.translationY;
			const minH = contentHeight * MIN_PANEL_RATIO;
			const maxH = contentHeight * MAX_PANEL_RATIO;
			panelHeight.value = Math.max(minH, Math.min(maxH, newHeight));
		})
		.onEnd(() => {
			if (contentHeight > 0) {
				const currentRatio = panelHeight.value / contentHeight;
				runOnJS(persistRatio)(currentRatio);
			}
		});

	// 키보드가 올라오면 콘텐츠 영역이 줄어드는데 panelHeight는 픽셀 고정값이라 패널이 잘릴 수 있다.
	// 렌더 높이만 가용 영역으로 제한하고 panelHeight 자체는 유지해, 키보드가 내려가면 원래 높이로 돌아온다.
	const memoAnimatedStyle = useAnimatedStyle(() => {
		const availableHeight =
			contentHeight > 0 ? contentHeight : panelHeight.value;

		return {
			height: Math.max(0, Math.min(panelHeight.value, availableHeight)),
		};
	});

	const headerWrapperStyle = useAnimatedStyle(() => ({
		height: Math.max(0, HEADER_HEIGHT + headerTranslateY.value),
	}));

	const handleBlogSelect = useCallback((url: string) => {
		setCurrentUrl(url);
		setPageTitle("");
	}, []);

	const handleShare = useCallback(() => {
		shareUrl(currentUrl, pageTitle);
	}, [currentUrl, pageTitle]);

	const isSelectionUnlocked = isDomainUnlocked(currentUrl, unlockedDomains);

	// 저장소 읽기가 첫 페이지 로드보다 늦게 끝나면 handleNavigationStateChange의
	// 자동 주입이 빈 목록을 보고 지나간다. 목록이 도착한 뒤 한 번 더 맞춘다.
	// UNLOCK_SELECTION_JS는 같은 문서에 두 번 들어가도 첫 줄에서 빠져나온다.
	useEffect(() => {
		if (!isSelectionUnlocked) {
			return;
		}

		webViewRef.current?.injectJavaScript(UNLOCK_SELECTION_JS);
	}, [isSelectionUnlocked]);

	/**
	 * 현재 도메인의 드래그 잠금 해제를 켜거나 끈다.
	 * @description 켤 때는 지금 보고 있는 문서에 즉시 주입한다. 끌 때는 이미 주입한
	 * 스타일과 리스너를 되돌릴 방법이 없으므로 페이지를 다시 읽어 원래 동작으로 돌린다.
	 */
	const handleSelectionUnlockToggle = async () => {
		const hostname = getHostname(currentUrl);
		if (!hostname) {
			return;
		}

		if (isSelectionUnlocked) {
			await removeUnlockedDomain(hostname);
			setUnlockedDomains((domains) =>
				domains.filter((domain) => domain !== hostname),
			);
			webViewRef.current?.reload();
			return;
		}

		await addUnlockedDomain(hostname);
		setUnlockedDomains((domains) => [...domains, hostname]);
		webViewRef.current?.injectJavaScript(UNLOCK_SELECTION_JS);
	};

	return {
		insets,
		webViewRef,
		currentUrl,
		urlInput,
		setUrlInput,
		isMemoOpen,
		isBlogSheetOpen,
		setIsBlogSheetOpen,
		contentHeight,
		setContentHeight,
		keyboardBottomInset,
		wishToast,
		pageTitle,
		pageFavIconUrl,
		isCurrentPageWish,
		isCurrentPageReading,
		isCurrentPageStar,
		isCurrentPageFavorite: !!isCurrentPageFavorite,
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
		openPanel,
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
	};
}

/** URL에서 hostname을 뽑는다. 파싱할 수 없는 값이면 null */
function getHostname(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

/** 해당 URL의 도메인이 드래그 잠금 해제 목록에 있는지 */
function isDomainUnlocked(url: string, unlockedDomains: string[]): boolean {
	const hostname = getHostname(url);
	if (!hostname) {
		return false;
	}

	return unlockedDomains.includes(hostname);
}
