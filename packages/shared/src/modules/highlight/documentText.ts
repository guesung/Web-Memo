/** 텍스트를 수집하지 않는 요소. 화면에 보이지 않거나 본문이 아닌 것들이다. */
const EXCLUDED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

/** 문서의 텍스트 노드를 순서대로 이어붙인 결과와 각 노드의 시작 offset */
export interface DocumentTextIndex {
	text: string;
	nodes: { node: Text; start: number }[];
}

/**
 * 문서 텍스트 인덱스를 만든다.
 * @description innerText는 CSS 레이아웃에 따라 값이 달라져 기기 간 이식되지 않으므로,
 * TreeWalker로 텍스트 노드만 순서대로 이어붙인다. createAnchor와 resolveAnchor가
 * 반드시 이 함수를 공유해야 offset 기준이 갈리지 않는다.
 */
export function buildDocumentTextIndex(root: Node): DocumentTextIndex {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const parentTag = node.parentElement?.tagName;

			if (parentTag && EXCLUDED_TAGS.has(parentTag)) {
				return NodeFilter.FILTER_REJECT;
			}

			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const nodes: { node: Text; start: number }[] = [];
	let text = "";

	let current = walker.nextNode();
	while (current) {
		const textNode = current as Text;
		const content = textNode.data;

		if (content.length > 0) {
			nodes.push({ node: textNode, start: text.length });
			text += content;
		}

		current = walker.nextNode();
	}

	return { text, nodes };
}

/**
 * 문서 텍스트 offset을 텍스트 노드 위치로 변환한다. 범위를 벗어나면 null.
 * @description 두 텍스트 노드가 맞닿은 경계 offset(한 노드의 끝이자 다음 노드의 시작)에서는
 * 기본적으로 다음 노드의 시작점(offset 0)을 반환한다. 문서 텍스트의 끝(offset === text.length)에는
 * 다음 노드가 없으므로 이 경우만 예외적으로 마지막 노드의 끝점을 반환한다.
 * `preferEnd: true`를 주면 경계 offset에서 다음 노드의 시작점 대신 이전 노드의 끝점을 반환한다.
 * Range의 끝점을 만들 때 다음 노드 시작(offset 0)을 그대로 쓰면 CSS Custom Highlight 렌더링에서
 * 다음 요소 시작 지점에 빈 하이라이트 조각이 생길 수 있어, resolveAnchor는 이 옵션으로 보정한다.
 */
export function offsetToPoint(
	index: DocumentTextIndex,
	offset: number,
	options: { preferEnd?: boolean } = {},
): { node: Text; offset: number } | null {
	if (offset < 0 || offset > index.text.length) {
		return null;
	}

	if (options.preferEnd) {
		const previousNodeEnd = findNodeEndingAt(index, offset);

		if (previousNodeEnd) {
			return previousNodeEnd;
		}
	}

	for (let i = index.nodes.length - 1; i >= 0; i -= 1) {
		const entry = index.nodes[i];

		if (offset >= entry.start) {
			return { node: entry.node, offset: offset - entry.start };
		}
	}

	return null;
}

/** offset이 어떤 텍스트 노드의 끝 경계와 정확히 일치하면 그 노드의 끝점을 반환한다. */
function findNodeEndingAt(
	index: DocumentTextIndex,
	offset: number,
): { node: Text; offset: number } | null {
	for (const entry of index.nodes) {
		const end = entry.start + entry.node.data.length;

		if (end === offset) {
			return { node: entry.node, offset: entry.node.data.length };
		}
	}

	return null;
}

/** 텍스트 노드 위치를 문서 텍스트 offset으로 변환한다. 인덱스에 없는 노드면 null. */
export function pointToOffset(
	index: DocumentTextIndex,
	node: Node,
	offset: number,
): number | null {
	const entry = index.nodes.find((candidate) => candidate.node === node);

	if (!entry) {
		return null;
	}

	return entry.start + offset;
}
