import { CONTEXT_LENGTH } from "./constants";
import {
	buildDocumentTextIndex,
	type DocumentTextIndex,
	pointToOffset,
} from "./documentText";
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
	const start = resolveStartOffset(
		index,
		range.startContainer,
		range.startOffset,
	);
	const end = resolveEndOffset(index, range.endContainer, range.endOffset);

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
 * Range 시작점을 문서 텍스트 offset으로 변환한다.
 * @description `container`가 인덱스에 있는 텍스트 노드면 `pointToOffset`으로 바로 변환된다.
 * 요소 노드(문단 전체 선택, 인라인 요소 경계 선택 등)이거나 길이 0인 텍스트 노드처럼
 * 인덱스에 없는 지점이면, 문서 순서상 그 지점과 같거나 그 뒤에 오는 첫 텍스트 노드를 찾아
 * 그 시작 offset을 쓴다.
 */
function resolveStartOffset(
	index: DocumentTextIndex,
	container: Node,
	offset: number,
): number | null {
	const direct = pointToOffset(index, container, offset);

	if (direct !== null) {
		return direct;
	}

	const probe = createProbeRange(container, offset);

	if (!probe) {
		return null;
	}

	for (const entry of index.nodes) {
		const comparison = comparePointSafe(probe, entry.node, 0);

		if (comparison !== null && comparison >= 0) {
			return entry.start;
		}
	}

	return null;
}

/**
 * Range 끝점을 문서 텍스트 offset으로 변환한다.
 * @description `resolveStartOffset`과 대칭이다. 인덱스에 없는 지점이면 문서 순서상
 * 그 지점과 같거나 그 앞에 오는 마지막 텍스트 노드를 찾아 그 끝 offset을 쓴다.
 */
function resolveEndOffset(
	index: DocumentTextIndex,
	container: Node,
	offset: number,
): number | null {
	const direct = pointToOffset(index, container, offset);

	if (direct !== null) {
		return direct;
	}

	const probe = createProbeRange(container, offset);

	if (!probe) {
		return null;
	}

	for (let i = index.nodes.length - 1; i >= 0; i -= 1) {
		const entry = index.nodes[i];
		const comparison = comparePointSafe(
			probe,
			entry.node,
			entry.node.data.length,
		);

		if (comparison !== null && comparison <= 0) {
			return entry.start + entry.node.data.length;
		}
	}

	return null;
}

/** (container, offset) 지점을 가리키는 collapsed Range를 만든다. 유효하지 않으면 null. */
function createProbeRange(container: Node, offset: number): Range | null {
	try {
		const probe = document.createRange();
		probe.setStart(container, offset);
		probe.collapse(true);
		return probe;
	} catch {
		return null;
	}
}

/**
 * `Range.comparePoint`를 안전하게 호출한다.
 * @description 노드가 다른 문서에 있거나 Document/DocumentType처럼 비교 불가능한
 * 노드 타입이면 예외를 던지므로 감싸서 null로 흡수한다.
 */
function comparePointSafe(
	probe: Range,
	node: Node,
	offset: number,
): number | null {
	try {
		return probe.comparePoint(node, offset);
	} catch {
		return null;
	}
}
