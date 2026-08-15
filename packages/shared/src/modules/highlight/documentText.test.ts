// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	buildDocumentTextIndex,
	offsetToPoint,
	pointToOffset,
} from "./documentText";

function render(html: string): HTMLElement {
	const root = document.createElement("div");
	root.innerHTML = html;
	return root;
}

describe("buildDocumentTextIndex", () => {
	it("텍스트 노드를 문서 순서대로 이어붙인다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		expect(buildDocumentTextIndex(root).text).toBe("앞강조뒤");
	});

	it("script와 style의 내용은 제외한다", () => {
		const root = render("<p>본문</p><script>var a=1;</script><style>p{}</style>");
		expect(buildDocumentTextIndex(root).text).toBe("본문");
	});

	it("각 텍스트 노드의 시작 offset을 기록한다", () => {
		const root = render("<p>앞<strong>강조</strong></p>");
		const index = buildDocumentTextIndex(root);
		expect(index.nodes.map((entry) => entry.start)).toEqual([0, 1]);
	});
});

describe("offsetToPoint / pointToOffset", () => {
	it("offset을 텍스트 노드 위치로 변환한다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		const index = buildDocumentTextIndex(root);
		const point = offsetToPoint(index, 2);

		expect(point?.node.textContent).toBe("강조");
		expect(point?.offset).toBe(1);
	});

	it("변환이 왕복으로 일치한다", () => {
		const root = render("<p>앞<strong>강조</strong>뒤</p>");
		const index = buildDocumentTextIndex(root);
		const point = offsetToPoint(index, 3);

		expect(pointToOffset(index, point!.node, point!.offset)).toBe(3);
	});

	it("범위를 벗어난 offset은 null을 반환한다", () => {
		const root = render("<p>짧음</p>");
		const index = buildDocumentTextIndex(root);

		expect(offsetToPoint(index, 999)).toBeNull();
	});
});
