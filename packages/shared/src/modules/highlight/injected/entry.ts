import type { HighlightColor } from "../../../constants/Highlight";
import { createHighlightRenderer } from "../renderHighlights";
import { resolveAnchor } from "../resolveAnchor";
import { createSelectionTracker } from "../selectionTracker";
import type { HighlightItem, HighlightOutboundMessage } from "../types";

/**
 * WebView에 주입되는 엔트리.
 * @description esbuild가 이 파일을 IIFE로 번들해 문자열로 만든다.
 * 앱은 window.__webmemo* 전역을 injectJavaScript로 호출해 이 스크립트를 조작한다.
 */

declare global {
	interface Window {
		__webmemoHighlightReady?: boolean;
		__webmemoCommitHighlight: () => void;
		__webmemoRestore: (items: HighlightItem[]) => void;
		__webmemoAdd: (item: HighlightItem) => void;
		__webmemoRemove: (id: number) => void;
		__webmemoSetColor: (id: number, color: HighlightColor) => void;
		ReactNativeWebView: { postMessage: (message: string) => void };
	}
}

function post(message: HighlightOutboundMessage): void {
	window.ReactNativeWebView.postMessage(JSON.stringify(message));
}

function getFavIconUrl(): string {
	const link =
		document.querySelector('link[rel="icon"]') ??
		document.querySelector('link[rel="shortcut icon"]') ??
		document.querySelector('link[rel="apple-touch-icon"]');

	return (
		(link as HTMLLinkElement | null)?.href ??
		`${window.location.origin}/favicon.ico`
	);
}

if (!window.__webmemoHighlightReady) {
	window.__webmemoHighlightReady = true;

	const renderer = createHighlightRenderer();
	const tracker = createSelectionTracker();
	tracker.start();

	/** 현재 페이지에 이미 저장된 앵커들. 중복 저장을 거르는 데 쓴다(설계 §6-4). */
	let savedAnchors: { exact: string; textPositionStart: number }[] = [];

	window.__webmemoCommitHighlight = () => {
		const rejection = tracker.getRejection();

		if (rejection) {
			post({ type: "highlight:rejected", reason: rejection });
			return;
		}

		const anchor = tracker.getPendingAnchor();

		if (!anchor) {
			return;
		}

		const isDuplicate = savedAnchors.some(
			(saved) =>
				saved.exact === anchor.exact &&
				saved.textPositionStart === anchor.textPositionStart,
		);

		if (isDuplicate) {
			post({ type: "highlight:rejected", reason: "duplicate" });
			return;
		}

		post({
			type: "highlight:create",
			anchor,
			url: window.location.href,
			title: document.title,
			favIconUrl: getFavIconUrl(),
		});
	};

	window.__webmemoRestore = (items) => {
		renderer.clear();
		savedAnchors = items.map((item) => ({
			exact: item.anchor.exact,
			textPositionStart: item.anchor.textPositionStart,
		}));

		let resolved = 0;
		let unresolved = 0;

		for (const item of items) {
			const range = resolveAnchor(item.anchor);

			if (!range) {
				unresolved += 1;
				continue;
			}

			renderer.add(item.id, range, item.color);
			resolved += 1;
		}

		post({ type: "highlight:restored", resolved, unresolved });
	};

	window.__webmemoAdd = (item) => {
		/**
		 * 해석 성공 여부와 무관하게 저장 목록에는 항상 반영한다. `__webmemoRestore`와 기준을
		 * 맞춰야 한다 — savedAnchors는 "현재 화면에 그려진 것"이 아니라 "이미 저장된 것"을
		 * 뜻하므로, 이 페이지에서 당장 해석되지 않는다고 중복 판정에서 빠지면 안 된다.
		 */
		savedAnchors.push({
			exact: item.anchor.exact,
			textPositionStart: item.anchor.textPositionStart,
		});

		const range = resolveAnchor(item.anchor);

		if (range) {
			renderer.add(item.id, range, item.color);
		}
	};

	window.__webmemoRemove = (id) => renderer.remove(id);

	window.__webmemoSetColor = (id, color) => renderer.setColor(id, color);

	document.addEventListener("click", (event) => {
		const id = renderer.hitTest(event.clientX, event.clientY);

		if (id !== null) {
			post({ type: "highlight:tap", id });
		}
	});
}
