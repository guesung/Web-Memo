import { useFocusEffect } from "@react-navigation/native";
import type { RefObject } from "react";
import { useCallback, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import type WebView from "react-native-webview";

/**
 * Android 하드웨어 뒤로가기를 웹뷰 히스토리에 연결한다.
 * @description 기본 동작은 탭 네비게이션을 되돌려 브라우저 탭에서 메모 탭으로 빠져나가므로,
 * 보고 있던 페이지의 히스토리가 통째로 무시된다. 브라우저 탭이 포커스된 동안에는 웹뷰에
 * 이전 페이지가 남아 있으면 웹뷰를 먼저 뒤로 보내고, 히스토리를 다 쓴 뒤에야 기본 동작
 * (탭 전환·앱 종료)에 넘긴다. iOS는 스와이프 제스처가 같은 역할을 하므로 등록하지 않는다.
 */
export function useAndroidWebViewBack({
	webViewRef,
}: {
	webViewRef: RefObject<WebView | null>;
}) {
	const canGoBackRef = useRef(false);

	/** `onNavigationStateChange`가 알려준 웹뷰 히스토리 보유 여부를 반영한다. */
	const syncCanGoBack = useCallback((canGoBack: boolean) => {
		canGoBackRef.current = canGoBack;
	}, []);

	useFocusEffect(
		useCallback(() => {
			if (Platform.OS !== "android") {
				return;
			}

			const subscription = BackHandler.addEventListener(
				"hardwareBackPress",
				() => {
					// 웹뷰가 언마운트된 홈(빈 브라우저) 화면에서는 직전 페이지의 값이 남아 있을 수 있다.
					if (!canGoBackRef.current || !webViewRef.current) {
						return false;
					}

					webViewRef.current.goBack();

					return true;
				},
			);

			return () => subscription.remove();
		}, [webViewRef]),
	);

	return { syncCanGoBack };
}
