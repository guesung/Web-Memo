import { CONTEXT_LENGTH } from "./constants";
import { buildDocumentTextIndex, pointToOffset } from "./documentText";
import type { HighlightAnchor } from "./types";

/**
 * 선택 영역을 텍스트 앵커로 변환한다.
 * @description 위치를 DOM 경로가 아니라 텍스트로 기억하므로, 모바일 WebView에서 만든 앵커를
 * DOM 구조가 다른 PC 브라우저에서도 해석할 수 있다.
 * @returns 유효하지 않은 선택이면 null
 */
export function createAnchor(
	range: Range,
	root: Node = document.body,
): HighlightAnchor | null {
	if (range.collapsed) {
		return null;
	}

	const index = buildDocumentTextIndex(root);
	const startPoint = resolveStartPoint(range.startContainer, range.startOffset);
	const endPoint = resolveEndPoint(range.endContainer, range.endOffset);

	if (!startPoint || !endPoint) {
		return null;
	}

	const start = pointToOffset(index, startPoint.node, startPoint.offset);
	const end = pointToOffset(index, endPoint.node, endPoint.offset);

	if (start === null || end === null || end <= start) {
		return null;
	}

	return {
		exact: index.text.slice(start, end),
		prefix: index.text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
		suffix: index.text.slice(end, end + CONTEXT_LENGTH),
		textPositionStart: start,
	};
}

/**
 * Range의 시작점을 텍스트 노드 위치로 보정한다.
 * @description `window.getSelection()`이 문단 전체 선택 등에서 `startContainer`로
 * 요소 노드를 주는 경우가 흔하다. 이때는 `childNodes[startOffset]`부터 문서 순서로 훑어
 * 첫 텍스트 노드를 찾고 그 노드의 offset 0을 시작점으로 쓴다.
 */
function resolveStartPoint(
	container: Node,
	offset: number,
): { node: Text; offset: number } | null {
	if (container.nodeType === Node.TEXT_NODE) {
		return { node: container as Text, offset };
	}

	const children = Array.from(container.childNodes);

	for (let i = offset; i < children.length; i += 1) {
		const found = findFirstTextNode(children[i]);

		if (found) {
			return { node: found, offset: 0 };
		}
	}

	return null;
}

/**
 * Range의 끝점을 텍스트 노드 위치로 보정한다.
 * @description `endContainer`가 요소 노드면 `childNodes[endOffset - 1]` 하위에서
 * 마지막 텍스트 노드를 찾고 그 노드의 끝(길이)을 끝점으로 쓴다.
 */
function resolveEndPoint(
	container: Node,
	offset: number,
): { node: Text; offset: number } | null {
	if (container.nodeType === Node.TEXT_NODE) {
		return { node: container as Text, offset };
	}

	const children = Array.from(container.childNodes);

	for (let i = offset - 1; i >= 0; i -= 1) {
		const found = findLastTextNode(children[i]);

		if (found) {
			return { node: found, offset: found.data.length };
		}
	}

	return null;
}

/** 주어진 노드부터 문서 순서로 훑어 첫 텍스트 노드를 찾는다. */
function findFirstTextNode(node: Node): Text | null {
	if (node.nodeType === Node.TEXT_NODE) {
		return node as Text;
	}

	for (const child of Array.from(node.childNodes)) {
		const found = findFirstTextNode(child);

		if (found) {
			return found;
		}
	}

	return null;
}

/** 주어진 노드부터 문서 역순으로 훑어 마지막 텍스트 노드를 찾는다. */
function findLastTextNode(node: Node): Text | null {
	if (node.nodeType === Node.TEXT_NODE) {
		return node as Text;
	}

	const children = Array.from(node.childNodes);

	for (let i = children.length - 1; i >= 0; i -= 1) {
		const found = findLastTextNode(children[i]);

		if (found) {
			return found;
		}
	}

	return null;
}
