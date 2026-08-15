import {
	HIGHLIGHT_COLOR_STYLE,
	HIGHLIGHT_COLORS,
	type HighlightColor,
} from "../../constants/Highlight";

/** ::highlight() 이름 접두사. 페이지의 다른 하이라이트와 충돌하지 않도록 붙인다. */
const HIGHLIGHT_NAME_PREFIX = "webmemo-";
const STYLE_ELEMENT_ID = "webmemo-highlight-style";
const DATA_ATTRIBUTE = "data-webmemo-hl";

/** 이 리포지토리의 TypeScript DOM lib이 아직 반영하지 않은 HighlightRegistry의 Map 메서드 */
interface MutableHighlightRegistry {
	set(name: string, highlight: Highlight): void;
	delete(name: string): boolean;
}

/** 이 리포지토리의 TypeScript DOM lib이 아직 반영하지 않은 caretPositionFromPoint */
interface DocumentWithCaretPosition {
	caretPositionFromPoint(
		x: number,
		y: number,
	): { offsetNode: Node; offset: number } | null;
}

export interface HighlightRenderer {
	add(id: number, range: Range, color: HighlightColor): void;
	remove(id: number): void;
	setColor(id: number, color: HighlightColor): void;
	/** 좌표에 있는 하이라이트 id. 없으면 null */
	hitTest(x: number, y: number): number | null;
	clear(): void;
}

/** 이 환경이 CSS Custom Highlight API를 쓸 수 있는지 */
function supportsCustomHighlight(): boolean {
	return (
		typeof CSS !== "undefined" &&
		typeof CSS.highlights !== "undefined" &&
		typeof globalThis.Highlight === "function"
	);
}

/**
 * 하이라이트 렌더러를 만든다.
 * @description 주 경로는 CSS Custom Highlight API다. DOM을 건드리지 않으므로 React 기반
 * 사이트를 망가뜨리지 않는다. 이 API가 없는 환경(iOS 15.1~17.1의 WKWebView)에서는
 * `<span>` 래핑으로 폴백한다. 폴백은 예비 경로가 아니라 실사용 경로이므로, 하이라이트를
 * 여러 개 추가해도 offset이 틀어지지 않도록 각 `add` 호출마다 그 Range를 즉시 감싼다.
 */
export function createHighlightRenderer(): HighlightRenderer {
	const entries = new Map<number, { range: Range; color: HighlightColor }>();

	if (supportsCustomHighlight()) {
		ensureHighlightStyles();
	}

	function repaintCustomHighlights(): void {
		const registry = CSS.highlights as unknown as MutableHighlightRegistry;

		for (const color of HIGHLIGHT_COLORS) {
			const name = `${HIGHLIGHT_NAME_PREFIX}${color}`;
			const rangesForColor = [...entries.values()]
				.filter((entry) => entry.color === color)
				.map((entry) => entry.range);

			if (rangesForColor.length === 0) {
				registry.delete(name);
				continue;
			}

			registry.set(name, new Highlight(...rangesForColor));
		}
	}

	function addFallbackSpan(
		id: number,
		range: Range,
		color: HighlightColor,
	): void {
		const span = document.createElement("span");
		span.setAttribute(DATA_ATTRIBUTE, String(id));
		span.style.backgroundColor = HIGHLIGHT_COLOR_STYLE[color].background;
		span.appendChild(range.extractContents());
		range.insertNode(span);
	}

	/**
	 * id에 해당하는 폴백 span을 모두 찾는다.
	 * @description 겹치는 하이라이트를 추가하면 기존 span이 여러 DOM 조각으로 쪼개지므로
	 * 같은 id를 가진 span이 2개 이상 존재할 수 있다. 그래서 단수(`querySelector`)가 아닌
	 * 복수(`querySelectorAll`)로 모든 조각을 찾는다.
	 */
	function findFallbackSpans(id: number): HTMLElement[] {
		return [
			...document.querySelectorAll<HTMLElement>(`[${DATA_ATTRIBUTE}="${id}"]`),
		];
	}

	function removeFallbackSpan(id: number): void {
		for (const span of findFallbackSpans(id)) {
			const parent = span.parentNode;

			if (!parent) {
				continue;
			}

			while (span.firstChild) {
				parent.insertBefore(span.firstChild, span);
			}
			parent.removeChild(span);
			parent.normalize();
		}
	}

	return {
		add(id, range, color) {
			entries.set(id, { range, color });

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			addFallbackSpan(id, range, color);
		},

		remove(id) {
			entries.delete(id);

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			removeFallbackSpan(id);
		},

		setColor(id, color) {
			const entry = entries.get(id);

			if (!entry) {
				return;
			}

			entries.set(id, { ...entry, color });

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			for (const span of findFallbackSpans(id)) {
				span.style.backgroundColor = HIGHLIGHT_COLOR_STYLE[color].background;
			}
		},

		hitTest(x, y) {
			if (!supportsCustomHighlight()) {
				const element = document.elementFromPoint(x, y);
				const span = element?.closest(`[${DATA_ATTRIBUTE}]`);
				const id = span?.getAttribute(DATA_ATTRIBUTE);

				return id === null || id === undefined ? null : Number(id);
			}

			const point = caretPointAt(x, y);

			if (!point) {
				return null;
			}

			for (const [id, entry] of entries) {
				if (isPointInRange(entry.range, point.node, point.offset)) {
					return id;
				}
			}

			return null;
		},

		clear() {
			const ids = [...entries.keys()];
			entries.clear();

			if (supportsCustomHighlight()) {
				repaintCustomHighlights();
				return;
			}

			for (const id of ids) {
				removeFallbackSpan(id);
			}
		},
	};
}

/**
 * 좌표의 캐럿 위치를 구한다.
 * @description CSS Custom Highlight API에는 "이 좌표가 어떤 하이라이트인가"를 알려주는
 * 표준 API가 없어서 캐럿 위치로 역산한다. `caretPositionFromPoint`(표준)를 우선 쓰고,
 * `caretRangeFromPoint`(비표준·deprecated)는 이를 지원하지 않는 구형 WebKit용 폴백이다.
 */
function caretPointAt(
	x: number,
	y: number,
): { node: Node; offset: number } | null {
	const withCaretPosition =
		document as unknown as Partial<DocumentWithCaretPosition>;

	if (typeof withCaretPosition.caretPositionFromPoint === "function") {
		const position = withCaretPosition.caretPositionFromPoint(x, y);

		return position
			? { node: position.offsetNode, offset: position.offset }
			: null;
	}

	const legacyRange = document.caretRangeFromPoint?.(x, y);

	return legacyRange
		? { node: legacyRange.startContainer, offset: legacyRange.startOffset }
		: null;
}

/**
 * 좌표가 가리키는 지점이 Range 안에 있는지 확인한다.
 * @description `comparePoint`는 지점이 Range 내부에 있을 때 0을 반환한다. 노드가 분리되어
 * 있거나 다른 문서에 있으면 예외를 던지므로 감싸서 흡수한다.
 */
function isPointInRange(range: Range, node: Node, offset: number): boolean {
	if (range.collapsed) {
		return false;
	}

	try {
		return range.comparePoint(node, offset) === 0;
	} catch {
		return false;
	}
}

/** ::highlight() 규칙을 문서에 한 번만 삽입한다 */
function ensureHighlightStyles(): void {
	if (document.getElementById(STYLE_ELEMENT_ID)) {
		return;
	}

	const style = document.createElement("style");
	style.id = STYLE_ELEMENT_ID;
	style.textContent = HIGHLIGHT_COLORS.map(
		(color) =>
			`::highlight(${HIGHLIGHT_NAME_PREFIX}${color}) { background-color: ${HIGHLIGHT_COLOR_STYLE[color].background}; }`,
	).join("\n");

	document.head.appendChild(style);
}
