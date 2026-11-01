type PendingNavigation = {
	previousUrl: string;
	requestedUrl: string;
	newDocumentStarted: boolean;
	returnStarted: boolean;
};

export type BrowserNavigationState = {
	/** 앱이 WebView에 요청한 URL. 관찰된 리다이렉트/링크 URL로 바꾸지 않는다. */
	sourceUrl: string;
	/** 동일 source URL을 앱에서 다시 요청할 때 WebView를 재생성한다. */
	revision: number;
	pending: PendingNavigation | null;
};

export function createBrowserNavigationState(
	sourceUrl: string,
): BrowserNavigationState {
	return { sourceUrl, revision: 0, pending: null };
}

export function beginNavigation(
	state: BrowserNavigationState,
	previousUrl: string,
	requestedUrl: string,
): BrowserNavigationState {
	return {
		sourceUrl: requestedUrl,
		revision:
			state.sourceUrl === requestedUrl ? state.revision + 1 : state.revision,
		pending: {
			previousUrl,
			requestedUrl,
			newDocumentStarted: false,
			returnStarted: false,
		},
	};
}

/** 새 문서의 로드 시작이 확인되면 이전 URL로 돌아오는 정상 리다이렉트를 허용한다. */
export function markNavigationLoadStart(
	state: BrowserNavigationState,
	url: string,
): BrowserNavigationState {
	const { pending } = state;
	if (
		!pending ||
		url === pending.previousUrl ||
		(url === "about:blank" && pending.requestedUrl !== "about:blank")
	) {
		return state;
	}
	return { ...state, pending: { ...pending, newDocumentStarted: true } };
}

export function cancelNavigation(
	state: BrowserNavigationState,
): BrowserNavigationState {
	return { ...state, pending: null };
}

/** 새 페이지를 요청한 직후 늦게 도착한 이전 문서 이벤트를 거른다. */
export function reconcileNavigation(
	state: BrowserNavigationState,
	observedUrl: string,
	isLoading: boolean,
): { accept: boolean; state: BrowserNavigationState } {
	const { pending } = state;
	if (!pending) return { accept: true, state };
	if (
		pending.previousUrl !== pending.requestedUrl &&
		observedUrl === pending.previousUrl
	) {
		if (!pending.newDocumentStarted || (!isLoading && !pending.returnStarted)) {
			return { accept: false, state };
		}
		if (isLoading) {
			return {
				accept: true,
				state: { ...state, pending: { ...pending, returnStarted: true } },
			};
		}
	}
	if (observedUrl === "about:blank" && pending.requestedUrl !== "about:blank") {
		return { accept: false, state };
	}
	return {
		accept: true,
		state: isLoading
			? markNavigationLoadStart(state, observedUrl)
			: { ...state, pending: null },
	};
}
