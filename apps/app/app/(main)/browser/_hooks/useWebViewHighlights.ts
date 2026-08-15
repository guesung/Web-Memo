import type { HighlightItem } from "@web-memo/shared/modules/highlight";
import { normalizeUrl } from "@web-memo/shared/utils";
import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import type WebView from "react-native-webview";
import type { WebViewCustomMenuItems } from "react-native-webview/lib/WebViewTypes";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useHighlightCreateMutation } from "@/lib/hooks/useHighlightMutation";
import { useHighlightsByUrl } from "@/lib/hooks/useHighlights";

const HIGHLIGHT_MENU_KEY = "webmemo-highlight";

/** WebView가 postMessage로 올려보내는 하이라이트 메시지 (JSON.parse 결과이므로 느슨한 형태) */
export type WebViewHighlightMessage = { type: string; [key: string]: unknown };

/**
 * 인앱 브라우저 WebView에서 텍스트 하이라이팅을 저장·조회·복원한다.
 * @description 페이지 URL은 RN의 `currentUrl`이 아니라 주입 스크립트가 `highlight:page`로
 * 보고한 값을 단일 출처로 쓴다. `currentUrl`은 `onNavigationStateChange` 타이밍에 뒤처지고
 * SPA 라우팅에서는 갱신되지 않아, 저장 시 URL과 조회 시 URL이 어긋날 수 있다.
 * `getHighlightsByUrl`은 `.eq()` 정확 일치 조회이므로 그 어긋남은 방금 저장한 하이라이트가
 * 목록에서 아예 보이지 않는 조용한 실패로 이어진다.
 */
export function useWebViewHighlights({
	webViewRef,
}: {
	webViewRef: RefObject<WebView | null>;
}) {
	const { isLoggedIn } = useAuth();
	const [tappedHighlightId, setTappedHighlightId] = useState<number | null>(
		null,
	);
	const [highlightToast, setHighlightToast] = useState<string | null>(null);
	const [pageUrl, setPageUrl] = useState("");

	/** 앱에 토스트 라이브러리가 없어 기존 wishToast와 같은 방식으로 3초 후 스스로 사라지게 한다 */
	const showToast = useCallback((message: string) => {
		setHighlightToast(message);
		setTimeout(() => setHighlightToast(null), 3000);
	}, []);

	const normalizedUrl = pageUrl ? normalizeUrl(pageUrl) : "";
	const { data: highlights } = useHighlightsByUrl(normalizedUrl);
	const { mutate: createHighlight } = useHighlightCreateMutation();

	/**
	 * 비로그인 상태에서는 메뉴 항목을 노출하지 않는다 (설계 §6-5).
	 * @description 반드시 `undefined`여야 한다. iOS 네이티브 구현(`RNCWebViewImpl.m`)은
	 * `menuItems`를 Objective-C 포인터로 다루는데, 빈 배열(`[]`)은 `nil`이 아니라서
	 * `canPerformAction:`이 `self.menuItems`가 존재한다고 판단해 "하이라이트"뿐 아니라
	 * 복사·전체선택 등 iOS 기본 텍스트 선택 메뉴 전체를 차단해 버린다. 빈 배열로 되돌리면
	 * 비로그인 사용자가 인앱 브라우저의 모든 페이지에서 텍스트를 복사할 수 없게 되는
	 * 회귀가 재발한다.
	 */
	const menuItems: WebViewCustomMenuItems[] | undefined = isLoggedIn
		? [{ label: "하이라이트", key: HIGHLIGHT_MENU_KEY }]
		: undefined;

	const handleCustomMenuSelection = useCallback(
		(event: { nativeEvent: { key: string } }) => {
			if (event.nativeEvent.key !== HIGHLIGHT_MENU_KEY) {
				return;
			}

			webViewRef.current?.injectJavaScript(
				"window.__webmemoCommitHighlight(); true;",
			);
		},
		[webViewRef],
	);

	const handleHighlightMessage = useCallback(
		(message: WebViewHighlightMessage) => {
			/** 스크립트가 알려준 페이지 URL이 조회·저장 양쪽의 단일 출처다 */
			if (message.type === "highlight:page") {
				setPageUrl(message.url as string);
				return;
			}

			if (message.type === "highlight:create") {
				createHighlight(
					{
						anchor: message.anchor as HighlightItem["anchor"],
						url: message.url as string,
						title: message.title as string,
						favIconUrl: message.favIconUrl as string,
					},
					{
						onSuccess: (saved) => {
							const item: HighlightItem = {
								id: saved.id,
								anchor: {
									exact: saved.exact_text,
									prefix: saved.prefix_text ?? "",
									suffix: saved.suffix_text ?? "",
									textPositionStart: saved.text_position_start ?? 0,
								},
								color: saved.color as HighlightItem["color"],
							};

							webViewRef.current?.injectJavaScript(
								`window.__webmemoAdd(${JSON.stringify(item)}); true;`,
							);
						},
						onError: () => showToast("하이라이트를 저장하지 못했습니다"),
					},
				);
				return;
			}

			if (message.type === "highlight:tap") {
				setTappedHighlightId(message.id as number);
				return;
			}

			if (message.type === "highlight:rejected") {
				showToast(
					message.reason === "tooLong"
						? "선택한 문장이 너무 깁니다"
						: "이미 하이라이트한 문장입니다",
				);
			}
		},
		[createHighlight, showToast, webViewRef],
	);

	/** 저장된 하이라이트를 WebView에 내려보낸다 */
	const restoreHighlights = useCallback(() => {
		if (!highlights?.length) {
			return;
		}

		const items: HighlightItem[] = highlights.map((row) => ({
			id: row.id,
			anchor: {
				exact: row.exact_text,
				prefix: row.prefix_text ?? "",
				suffix: row.suffix_text ?? "",
				textPositionStart: row.text_position_start ?? 0,
			},
			color: row.color as HighlightItem["color"],
		}));

		webViewRef.current?.injectJavaScript(
			`window.__webmemoRestore(${JSON.stringify(items)}); true;`,
		);
	}, [highlights, webViewRef]);

	/**
	 * 복원 시점은 "페이지 로드가 끝났을 때"가 아니라 "그 페이지의 하이라이트 데이터가
	 * 도착했을 때"다. `highlights` 쿼리 결과가 바뀔 때마다(URL 변경, 조회 완료 등) 다시 그린다.
	 */
	useEffect(() => {
		restoreHighlights();
	}, [restoreHighlights]);

	const clearTappedHighlight = useCallback(() => {
		setTappedHighlightId(null);
	}, []);

	return {
		menuItems,
		handleCustomMenuSelection,
		handleHighlightMessage,
		restoreHighlights,
		rows: highlights ?? [],
		tappedHighlightId,
		clearTappedHighlight,
		highlightToast,
	};
}
