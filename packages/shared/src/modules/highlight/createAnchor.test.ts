// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createAnchor } from "./createAnchor";

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

describe("createAnchor", () => {
	it("선택한 문장을 exact에 담는다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		expect(anchor?.exact).toBe("라마바");
	});

	it("앞뒤 문맥을 prefix와 suffix에 담는다", () => {
		const root = render("<p>가나다라마바사아자차</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		expect(anchor?.prefix).toBe("가나다");
		expect(anchor?.suffix).toBe("사아자차");
	});

	it("문서 텍스트 기준 시작 offset을 기록한다", () => {
		const root = render("<p>가나다라마바사</p>");
		const anchor = createAnchor(rangeOf(root, "라마바"), root);

		expect(anchor?.textPositionStart).toBe(3);
	});

	it("문맥은 32자로 자른다", () => {
		const filler = "가".repeat(50);
		const root = render(`<p>${filler}핵심${filler}</p>`);
		const anchor = createAnchor(rangeOf(root, "핵심"), root);

		expect(anchor?.prefix).toHaveLength(32);
		expect(anchor?.suffix).toHaveLength(32);
	});

	it("collapsed range는 null을 반환한다", () => {
		const root = render("<p>가나다</p>");
		const paragraph = root.querySelector("p");

		if (!paragraph?.firstChild) {
			throw new Error("문단을 찾지 못했다");
		}

		const range = document.createRange();
		range.setStart(paragraph.firstChild, 1);
		range.collapse(true);

		expect(createAnchor(range, root)).toBeNull();
	});

	it("startContainer가 요소 노드인 선택에서도 앵커를 만든다", () => {
		const root = render("<p>가나다라마바사</p>");
		const paragraph = root.querySelector("p");

		if (!paragraph) {
			throw new Error("문단을 찾지 못했다");
		}

		const range = document.createRange();
		range.selectNodeContents(paragraph);

		const anchor = createAnchor(range, root);

		expect(anchor?.exact).toBe("가나다라마바사");
	});

	it("여러 자식 요소에 걸친 선택에서 exact가 올바르다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		const paragraph = root.querySelector("p");

		if (!paragraph) {
			throw new Error("문단을 찾지 못했다");
		}

		const range = document.createRange();
		range.selectNodeContents(paragraph);

		const anchor = createAnchor(range, root);

		expect(anchor?.exact).toBe("앞강조뒤");
	});
});
