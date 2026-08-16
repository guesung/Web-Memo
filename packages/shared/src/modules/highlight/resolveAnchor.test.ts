// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createAnchor } from "./createAnchor";
import { resolveAnchor } from "./resolveAnchor";

function render(html: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = html;
	document.body.appendChild(root);
	return root;
}

/** 문서 텍스트 기준 [start, end) 구간을 감싸는 Range를 만든다 */
function rangeOf(root: HTMLElement, target: string): Range {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode() as Text | null;

	while (node) {
		const index = node.data.indexOf(target);

		if (index !== -1) {
			const range = document.createRange();
			range.setStart(node, index);
			range.setEnd(node, index + target.length);
			return range;
		}

		node = walker.nextNode() as Text | null;
	}

	throw new Error(`대상 텍스트를 찾지 못했다: ${target}`);
}

describe("resolveAnchor", () => {
	it("같은 문서에서 원래 선택을 그대로 복원한다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		if (!anchor) {
			throw new Error("앵커 생성에 실패했다");
		}

		expect(resolveAnchor(anchor, root)?.toString()).toBe("라마바");
	});

	it("요소 경계를 가로지르는 선택도 복원한다", () => {
		const root = render("<p>앞부분<strong>강조된곳</strong>뒷부분</p>");
		const paragraph = root.querySelector("p");
		const strong = root.querySelector("strong");

		if (!paragraph || !strong) {
			throw new Error("테스트 마크업 구성에 실패했다");
		}

		const first = paragraph.childNodes[0] as Text;
		const emphasized = strong.firstChild as Text;
		const last = paragraph.childNodes[2] as Text;

		const range = document.createRange();
		range.setStart(first, 1);
		range.setEnd(last, 2);
		const anchor = createAnchor(range, root);

		if (!anchor) {
			throw new Error("앵커 생성에 실패했다");
		}

		expect(anchor.exact).toBe("부분강조된곳뒷부");

		const resolved = resolveAnchor(anchor, root);

		expect(resolved?.toString()).toBe("부분강조된곳뒷부");
		expect(emphasized.data).toBe("강조된곳");
	});

	it("문단이 옮겨져도 문장이 남아 있으면 찾는다", () => {
		const source = render("<p>가나다라마바사</p>");
		const anchor = createAnchor(rangeOf(source, "라마바"), source);

		if (!anchor) {
			throw new Error("앵커 생성에 실패했다");
		}

		const moved = render("<div>새로운 머리말</div><p>가나다라마바사</p>");

		expect(resolveAnchor(anchor, moved)?.toString()).toBe("라마바");
	});

	it("같은 문장이 여러 번 나오면 문맥으로 올바른 쪽을 고른다", () => {
		const source = render("<p>하나 사과 둘 사과 셋</p>");
		const anchor = createAnchor(rangeOf(source, "사과 둘"), source);

		if (!anchor) {
			throw new Error("앵커 생성에 실패했다");
		}

		const resolved = resolveAnchor(anchor, source);

		if (!resolved) {
			throw new Error("앵커 복원에 실패했다");
		}

		expect(resolved.toString()).toBe("사과 둘");
		expect(resolved.startOffset).toBe(3);
	});

	it("원문에서 사라진 문장은 null을 반환한다", () => {
		const source = render("<p>가나다라마바사</p>");
		const anchor = createAnchor(rangeOf(source, "라마바"), source);

		if (!anchor) {
			throw new Error("앵커 생성에 실패했다");
		}

		const changed = render("<p>완전히 다른 내용으로 바뀐 문서입니다</p>");

		expect(resolveAnchor(anchor, changed)).toBeNull();
	});

	it("매칭이 텍스트 노드 경계에서 끝나면 끝점을 이전 노드의 끝으로 잡는다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		const paragraph = root.querySelector("p");
		const strong = root.querySelector("strong");

		if (!paragraph || !strong) {
			throw new Error("테스트 마크업 구성에 실패했다");
		}

		const leading = paragraph.childNodes[0] as Text;
		const emphasizedStart = strong.firstChild as Text;

		const range = document.createRange();
		range.setStart(leading, 0);
		range.setEnd(emphasizedStart, emphasizedStart.data.length);
		const anchor = createAnchor(range, root);

		if (!anchor) {
			throw new Error("앵커 생성에 실패했다");
		}

		const resolved = resolveAnchor(anchor, root);
		const emphasized = strong.firstChild;

		if (!resolved || !emphasized) {
			throw new Error("앵커 복원에 실패했다");
		}

		expect(resolved.toString()).toBe("앞강조");
		expect(resolved.endContainer).toBe(emphasized);
		expect(resolved.endOffset).toBe((emphasized as Text).data.length);
	});
});
