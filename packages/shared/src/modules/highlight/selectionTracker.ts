import { createAnchor } from "./createAnchor";
import type { HighlightAnchor } from "./types";

/** 이보다 짧은 선택은 오터치로 본다. 기존 확장의 텍스트 선택 핸들러와 같은 기준이다. */
export const MIN_SELECTION_LENGTH = 3;

/** 이보다 긴 선택은 근사 매칭 성능이 나빠져 거절한다. */
export const MAX_SELECTION_LENGTH = 5000;

/**
 * selectionchange 이벤트를 모아 앵커 계산을 미루는 지연 시간(ms).
 * @description selectionchange는 드래그 도중 매우 잦게 발생하지만, 앵커 계산(createAnchor)은
 * 매번 문서 전체를 TreeWalker로 순회해 텍스트를 이어붙인다. 디바운스 없이 매 이벤트마다
 * 이 계산을 돌리면 긴 문서에서 드래그 중 체감 렉이 생길 수 있다. 선택 유효성 판정(길이,
 * 선택 가능 대상 여부)은 비싸지 않으므로 여기에는 디바운스를 걸지 않고, 비싼 createAnchor
 * 호출만 지연시킨다. 네이티브 컨텍스트 메뉴가 뜨고 사용자가 "하이라이트"를 누르기까지는
 * 이 지연보다 충분히 여유가 있어 커밋 시점에는 항상 최신 앵커가 준비돼 있다.
 */
const ANCHOR_COMPUTE_DEBOUNCE_MS = 150;

/**
 * 선택 대상으로 허용할 노드인지 판정한다.
 * @description contenteditable 배제는 필수다. 해당 요소에서는 react-native-webview의
 * menuItems가 동작하지 않고 AutoFill만 뜨는 알려진 이슈가 있다.
 */
export function isSelectableTarget(node: Node | null): boolean {
	if (!node) {
		return false;
	}

	const element =
		node.nodeType === Node.ELEMENT_NODE
			? (node as Element)
			: node.parentElement;

	if (!element) {
		return false;
	}

	if (element.closest("input, textarea, [contenteditable='true']")) {
		return false;
	}

	return true;
}

/**
 * 선택이 바뀔 때마다 앵커를 미리 계산해 캐싱하는 추적기를 만든다.
 * @description `onCustomMenuSelection` 콜백은 `selectedText`만 주고 Range를 주지 않으며,
 * 콜백을 받은 뒤에 선택을 읽으려 하면 이미 해제되어 있을 수 있다. 그래서 선택이 바뀔 때마다
 * 미리 앵커를 계산해 두고, 커밋 시점에는 캐시된 값을 쓰기만 한다.
 */
export function createSelectionTracker() {
	let pendingAnchor: HighlightAnchor | null = null;
	let rejection: "tooLong" | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function cancelPendingCompute(): void {
		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
	}

	function handleSelectionChange(): void {
		pendingAnchor = null;
		rejection = null;
		cancelPendingCompute();

		const selection = document.getSelection();

		if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
			return;
		}

		const range = selection.getRangeAt(0);
		const text = range.toString().trim();

		if (text.length < MIN_SELECTION_LENGTH) {
			return;
		}

		/** 너무 긴 선택은 거절 사유를 남긴다. 앱이 이유를 알려줘야 사용자가 다시 시도할 수 있다. */
		if (text.length > MAX_SELECTION_LENGTH) {
			rejection = "tooLong";
			return;
		}

		if (!isSelectableTarget(range.startContainer)) {
			return;
		}

		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			pendingAnchor = createAnchor(range);
		}, ANCHOR_COMPUTE_DEBOUNCE_MS);
	}

	return {
		start() {
			document.addEventListener("selectionchange", handleSelectionChange);
		},
		stop() {
			document.removeEventListener("selectionchange", handleSelectionChange);
			cancelPendingCompute();
		},
		getPendingAnchor: () => pendingAnchor,
		getRejection: () => rejection,
	};
}
