import type { HighlightColor } from "@web-memo/shared/constants";
import {
	type HighlightItem,
	toHighlightItem,
} from "@web-memo/shared/modules/highlight";
import { normalizeUrl } from "@web-memo/shared/utils/url";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";
import type WebView from "react-native-webview";
import type { WebViewCustomMenuItems } from "react-native-webview/lib/WebViewTypes";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
	useHighlightCreateMutation,
	useHighlightDeleteMutation,
	useHighlightUpdateMutation,
} from "@/lib/hooks/useHighlightMutation";
import { useHighlightsByUrl } from "@/lib/hooks/useHighlights";

/** 하이라이트 수정 입력. 색상 변경 시 WebView 밑줄 색도 함께 갱신한다. */
interface UpdateHighlightInput {
	id: number;
	url: string;
	color?: HighlightColor;
	note?: string;
}

/** 하이라이트 삭제 입력. */
interface DeleteHighlightInput {
	id: number;
	url: string;
}

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
	/**
	 * 스크립트가 `highlight:page`를 보낼 때마다(최초 진입뿐 아니라 새로고침으로 스크립트
	 * 전역이 리셋된 경우도 포함) 증가하는 카운터. 새로고침은 같은 URL을 다시 보고하므로
	 * `pageUrl`이 안 바뀌고, 그 URL의 쿼리 데이터도 이미 캐시돼 있어 `highlights` 참조도
	 * 안 바뀐다 — 둘 다 안 바뀌면 복원 effect가 트리거될 신호가 없어진다. 이 카운터가
	 * "스크립트가 다시 떴다"는 사실 자체를 신호로 만든다.
	 */
	const [pageEpoch, setPageEpoch] = useState(0);

	/** 앱에 토스트 라이브러리가 없어 기존 wishToast와 같은 방식으로 3초 후 스스로 사라지게 한다 */
	const showToast = useCallback((message: string) => {
		setHighlightToast(message);
		setTimeout(() => setHighlightToast(null), 3000);
	}, []);

	const normalizedUrl = pageUrl ? normalizeUrl(pageUrl) : "";
	const { data: highlights, isSuccess: isHighlightsSuccess } =
		useHighlightsByUrl(normalizedUrl);
	const { mutate: createHighlight } = useHighlightCreateMutation();
	const { mutate: mutateHighlightUpdate } = useHighlightUpdateMutation();
	const { mutate: mutateHighlightDelete } = useHighlightDeleteMutation();

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
			/**
			 * 스크립트가 알려준 페이지 URL이 조회·저장 양쪽의 단일 출처다.
			 * epoch를 항상 증가시켜, URL이 안 바뀌는 새로고침(스크립트만 리셋)에서도
			 * 복원 effect가 트리거되게 한다.
			 */
			if (message.type === "highlight:page") {
				setPageUrl(message.url as string);
				setPageEpoch((epoch) => epoch + 1);
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
							const item = toHighlightItem(saved);

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

	/**
	 * 저장된 하이라이트를 WebView에 내려보낸다.
	 * @description `highlights`가 `undefined`(로딩 중)일 때만 건너뛴다. 빈 배열(`[]`,
	 * 즉 "조회는 끝났는데 하이라이트가 0건")은 반드시 내려보내야 한다 — 그래야 스크립트가
	 * `__webmemoRestore([])`를 받아 `renderer.clear()`로 화면의 밑줄을 지우고
	 * `savedAnchors`를 빈 배열로 재구성한다. 이 신호가 없으면 마지막 하이라이트를 삭제한
	 * 뒤에도 스크립트의 `savedAnchors`에 지운 앵커가 남아, 같은 문장을 다시 그으려 하면
	 * "이미 하이라이트한 문장입니다"로 잘못 거절된다(entry.ts의 `savedAnchors`는
	 * `__webmemoRestore`에서만 재구성되기 때문).
	 */
	const restoreHighlights = useCallback(() => {
		if (!highlights) {
			return;
		}

		const items: HighlightItem[] = highlights.map(toHighlightItem);

		webViewRef.current?.injectJavaScript(
			`window.__webmemoRestore(${JSON.stringify(items)}); true;`,
		);
	}, [highlights, webViewRef]);

	/**
	 * 복원 시점은 "페이지 로드가 끝났을 때"가 아니라 "그 페이지의 하이라이트 데이터가
	 * 도착했을 때"다.
	 * @description 의존성이 두 겹인 이유:
	 * - `restoreHighlights`(= `highlights` 변경): URL이 바뀌어 새 쿼리 데이터가 도착했을 때.
	 * - `pageEpoch`: URL이 안 바뀌는 새로고침처럼, 스크립트 전역은 리셋됐지만 쿼리 데이터는
	 *   이미 캐시돼 있어 `highlights` 참조가 그대로인 경우. 이 경우 `restoreHighlights`의
	 *   identity가 안 바뀌므로 그것만 의존하면 트리거가 안 된다.
	 *
	 * `isHighlightsSuccess` 게이트: `pageUrl`과 `pageEpoch`는 같은 렌더에서 함께 바뀌므로,
	 * URL이 바뀐 직후의 렌더에서 `highlights`는 이미 새 URL의 쿼리 상태를 가리킨다(로딩 중이면
	 * `undefined`) — 이전 URL의 데이터가 새 URL의 `highlights`로 새어 들어오지는 않는다.
	 * 지금 이 훅은 `placeholderData`/`keepPreviousData`를 쓰지 않으므로 이 게이트는 사실상
	 * `restoreHighlights` 내부의 `!highlights` 가드와 같은 시점에 같은 걸 막는 이중 방어다.
	 * 다만 나중에 로딩 깜빡임을 줄이려고 `placeholderData`가 추가되면 얘기가 달라진다 —
	 * TanStack Query v5에서 `placeholderData`가 있으면 이전 키의 데이터를 보여주는 동안에도
	 * `isSuccess`가 true가 되므로, 그 시점엔 이 조건을 `isSuccess`가 아니라
	 * `!isPlaceholderData`로 바꿔야 이전 URL의 하이라이트가 새 URL에 잘못 그려지는 걸 막는다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: pageEpoch는 본문에서 읽지 않지만, 같은 URL을 다시 보고하는 새로고침에서도 effect를 재실행시키기 위한 nonce
	useEffect(() => {
		if (!isHighlightsSuccess) {
			return;
		}

		restoreHighlights();
	}, [pageEpoch, isHighlightsSuccess, restoreHighlights]);

	const clearTappedHighlight = useCallback(() => {
		setTappedHighlightId(null);
	}, []);

	/**
	 * 하이라이트 편집 바텀시트에서 색상/코멘트를 바꾼다.
	 * @description 색상 변경은 서버 반영이 확인된 뒤(`onSuccess`)에야 WebView 밑줄 색도
	 * 바꾼다. `useHighlightCreateMutation`과 같은 이유(설계 §6-2)로, 화면에 보이는 색과
	 * 서버에 저장된 색이 어긋나는 상태를 만들지 않기 위함이다.
	 */
	const updateHighlight = useCallback(
		(input: UpdateHighlightInput) => {
			mutateHighlightUpdate(input, {
				onSuccess: (saved) => {
					if (input.color === undefined) {
						return;
					}

					webViewRef.current?.injectJavaScript(
						`window.__webmemoSetColor(${saved.id}, ${JSON.stringify(saved.color)}); true;`,
					);
				},
				onError: () => showToast("하이라이트를 수정하지 못했습니다"),
			});
		},
		[mutateHighlightUpdate, showToast, webViewRef],
	);

	/** 하이라이트를 삭제하고, 서버 반영이 확인된 뒤 WebView의 밑줄도 지운다. */
	const deleteHighlight = useCallback(
		(input: DeleteHighlightInput) => {
			mutateHighlightDelete(input, {
				onSuccess: () => {
					webViewRef.current?.injectJavaScript(
						`window.__webmemoRemove(${input.id}); true;`,
					);
				},
				onError: () => showToast("하이라이트를 삭제하지 못했습니다"),
			});
		},
		[mutateHighlightDelete, showToast, webViewRef],
	);

	return {
		menuItems,
		handleCustomMenuSelection,
		handleHighlightMessage,
		restoreHighlights,
		rows: highlights ?? [],
		tappedHighlightId,
		clearTappedHighlight,
		highlightToast,
		updateHighlight,
		deleteHighlight,
	};
}
