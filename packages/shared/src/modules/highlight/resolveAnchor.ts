import {
	buildDocumentTextIndex,
	type DocumentTextIndex,
	offsetToPoint,
} from "./documentText";
import { matchQuote } from "./matchQuote";
import type { HighlightAnchor } from "./types";

/**
 * 이미 만들어둔 문서 인덱스에서 앵커 하나를 Range로 되살린다.
 * @description Range 끝점은 `offsetToPoint`에 `preferEnd`를 줘서 만든다. 매칭이 텍스트 노드
 * 경계에서 끝나는 경우 다음 노드의 시작점(offset 0)이 아니라 이전 노드의 끝점을 골라야, CSS
 * Custom Highlight로 렌더할 때 다음 요소 시작 지점에 빈 하이라이트 조각이 생기지 않는다.
 */
function resolveWithIndex(
	index: DocumentTextIndex,
	anchor: HighlightAnchor,
): Range | null {
	const match = matchQuote(index.text, anchor.exact, {
		prefix: anchor.prefix,
		suffix: anchor.suffix,
		hint: anchor.textPositionStart,
	});

	if (!match) {
		return null;
	}

	const start = offsetToPoint(index, match.start);
	const end = offsetToPoint(index, match.end, { preferEnd: true });

	if (!start || !end) {
		return null;
	}

	const range = document.createRange();
	range.setStart(start.node, start.offset);
	range.setEnd(end.node, end.offset);

	return range;
}

/**
 * 텍스트 앵커를 현재 문서의 Range로 되살린다.
 * @description 저장된 앵커를 DOM 경로가 아니라 텍스트로 다시 찾으므로, 앵커를 만든 문서와
 * DOM 구조가 다르더라도(모바일 WebView ↔ PC 브라우저) 같은 문장이 남아 있으면 복원할 수 있다.
 * @returns 원문에서 문장을 찾지 못하면 null. 호출자는 이 경우 렌더를 건너뛴다.
 */
export function resolveAnchor(
	anchor: HighlightAnchor,
	root: Node = document.body,
): Range | null {
	return resolveWithIndex(buildDocumentTextIndex(root), anchor);
}

/**
 * 여러 앵커를 문서 인덱싱 한 번으로 되살린다.
 * @description `resolveAnchor`를 N번 부르면 문서를 N번 훑는다. DOM 변경마다 재시도하는
 * 호출자(확장의 복원 모듈)에게는 그 비용이 감당되지 않으므로 배치 경로를 따로 둔다.
 * @returns 입력과 같은 길이·순서의 배열. 찾지 못한 앵커 자리는 null이다.
 */
export function resolveAnchors(
	anchors: HighlightAnchor[],
	root: Node = document.body,
): (Range | null)[] {
	const index = buildDocumentTextIndex(root);

	return anchors.map((anchor) => resolveWithIndex(index, anchor));
}
