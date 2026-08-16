import { buildDocumentTextIndex, offsetToPoint } from "./documentText";
import { matchQuote } from "./matchQuote";
import type { HighlightAnchor } from "./types";

/**
 * 텍스트 앵커를 현재 문서의 Range로 되살린다.
 * @description 저장된 앵커를 DOM 경로가 아니라 텍스트로 다시 찾으므로, 앵커를 만든 문서와
 * DOM 구조가 다르더라도(모바일 WebView ↔ PC 브라우저) 같은 문장이 남아 있으면 복원할 수 있다.
 * Range 끝점은 `offsetToPoint`에 `preferEnd`를 줘서 만든다. 매칭이 텍스트 노드 경계에서
 * 끝나는 경우 다음 노드의 시작점(offset 0)이 아니라 이전 노드의 끝점을 골라야, CSS Custom
 * Highlight로 렌더할 때 다음 요소 시작 지점에 빈 하이라이트 조각이 생기지 않는다.
 * @returns 원문에서 문장을 찾지 못하면 null. 호출자는 이 경우 렌더를 건너뛴다.
 */
export function resolveAnchor(
	anchor: HighlightAnchor,
	root: Node = document.body,
): Range | null {
	const index = buildDocumentTextIndex(root);
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
