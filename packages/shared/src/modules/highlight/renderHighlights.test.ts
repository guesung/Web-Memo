// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { HIGHLIGHT_COLOR_STYLE } from "../../constants/Highlight";
import { createHighlightRenderer } from "./renderHighlights";

function setup(): { root: HTMLElement; range: Range } {
	const root = document.createElement("div");
	root.innerHTML = "<p>가나다라마바사</p>";
	document.body.appendChild(root);

	const textNode = root.querySelector("p")?.firstChild;
	if (!(textNode instanceof Text)) {
		throw new Error("텍스트 노드를 찾지 못했다");
	}

	const range = document.createRange();
	range.setStart(textNode, 3);
	range.setEnd(textNode, 6);

	return { root, range };
}

describe("createHighlightRenderer (폴백 경로)", () => {
	// 각 테스트가 만든 root를 document.body에 붙이므로, 정리하지 않으면 이전 테스트의
	// data-webmemo-hl span이 document 전역 조회(remove/setColor)에 섞여 들어간다.
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("추가하면 선택 구간을 span으로 감싼다", () => {
		const { root, range } = setup();
		createHighlightRenderer().add(1, range, "yellow");

		const marked = root.querySelector("[data-webmemo-hl]");
		expect(marked?.textContent).toBe("라마바");
	});

	it("span에 하이라이트 id를 남긴다", () => {
		const { root, range } = setup();
		createHighlightRenderer().add(7, range, "yellow");

		expect(
			root.querySelector("[data-webmemo-hl]")?.getAttribute("data-webmemo-hl"),
		).toBe("7");
	});

	it("색을 바꾸면 배경색이 갱신된다", () => {
		const { root, range } = setup();
		const renderer = createHighlightRenderer();
		renderer.add(1, range, "yellow");
		renderer.setColor(1, "blue");

		const marked = root.querySelector("[data-webmemo-hl]") as HTMLElement;
		const expectedProbe = document.createElement("span");
		expectedProbe.style.backgroundColor = HIGHLIGHT_COLOR_STYLE.blue.background;

		expect(marked.style.backgroundColor).not.toBe("");
		expect(marked.style.backgroundColor).toBe(
			expectedProbe.style.backgroundColor,
		);
	});

	it("제거하면 span이 사라진다", () => {
		const { root, range } = setup();
		const renderer = createHighlightRenderer();
		renderer.add(1, range, "yellow");
		renderer.remove(1);

		expect(root.querySelector("[data-webmemo-hl]")).toBeNull();
	});

	it("clear는 모든 하이라이트를 지운다", () => {
		const { root, range } = setup();
		const renderer = createHighlightRenderer();
		renderer.add(1, range, "yellow");
		renderer.clear();

		expect(root.querySelectorAll("[data-webmemo-hl]")).toHaveLength(0);
	});

	it("하이라이트를 두 개 추가해도 둘 다 올바른 텍스트를 감싼다", () => {
		const root = document.createElement("div");
		root.innerHTML = "<p>가나다라마바사아자차</p>";
		document.body.appendChild(root);

		const renderer = createHighlightRenderer();

		// 앞쪽부터 하나씩 추가한다. span 삽입으로 텍스트 노드가 쪼개지므로
		// 두 번째 Range는 삽입 후의 DOM에서 새로 만들어야 한다.
		const first = document.createRange();
		const firstNode = root.querySelector("p")?.firstChild;
		if (!(firstNode instanceof Text)) {
			throw new Error("첫 텍스트 노드를 찾지 못했다");
		}
		first.setStart(firstNode, 0);
		first.setEnd(firstNode, 3);
		renderer.add(1, first, "yellow");

		const remaining = root.querySelector("p")?.lastChild;
		if (!(remaining instanceof Text)) {
			throw new Error("남은 텍스트 노드를 찾지 못했다");
		}
		// remaining은 "라마바사아자차"(원문 인덱스 3~9)이므로 offset 3~6은 "사아자"를 가리킨다.
		const second = document.createRange();
		second.setStart(remaining, 3);
		second.setEnd(remaining, 6);
		renderer.add(2, second, "green");

		const marks = [...root.querySelectorAll("[data-webmemo-hl]")];
		expect(marks.map((mark) => mark.textContent)).toEqual(["가나다", "사아자"]);
		expect(root.textContent).toBe("가나다라마바사아자차");
	});

	it("겹치는 하이라이트를 지우면 조각이 남지 않는다", () => {
		const root = document.createElement("div");
		root.innerHTML = "<p>가나다라마바사</p>";
		document.body.appendChild(root);

		const renderer = createHighlightRenderer();

		const firstNode = root.querySelector("p")?.firstChild;
		if (!(firstNode instanceof Text)) {
			throw new Error("첫 텍스트 노드를 찾지 못했다");
		}
		const first = document.createRange();
		first.setStart(firstNode, 3);
		first.setEnd(firstNode, 6);
		renderer.add(1, first, "yellow");

		// id=1 영역과 겹치는 범위를 추가하면 id=1의 span이 여러 DOM 조각으로 쪼개진다.
		const overlapStart = root.querySelector("p")?.firstChild;
		const overlapEndNode = root.querySelector(
			'[data-webmemo-hl="1"]',
		)?.firstChild;
		if (!(overlapStart instanceof Text) || !(overlapEndNode instanceof Text)) {
			throw new Error("겹칠 텍스트 노드를 찾지 못했다");
		}
		const second = document.createRange();
		second.setStart(overlapStart, 2);
		second.setEnd(overlapEndNode, 2);
		renderer.add(2, second, "green");

		// id=1의 span이 실제로 2개 이상의 조각으로 쪼개졌는지 전제를 확인한다.
		expect(
			root.querySelectorAll('[data-webmemo-hl="1"]').length,
		).toBeGreaterThan(1);

		renderer.remove(1);

		expect(root.querySelectorAll('[data-webmemo-hl="1"]')).toHaveLength(0);
		expect(root.textContent).toBe("가나다라마바사");
	});

	it("요소를 가로지르는 선택을 감싸도 페이지 텍스트가 보존된다", () => {
		const root = document.createElement("div");
		root.innerHTML = "<p>앞<strong>강조</strong>뒤</p>";
		document.body.appendChild(root);

		const paragraph = root.querySelector("p");
		const strongText = root.querySelector("strong")?.firstChild;
		const tail = paragraph?.lastChild;
		if (!(strongText instanceof Text) || !(tail instanceof Text)) {
			throw new Error("대상 텍스트 노드를 찾지 못했다");
		}

		const range = document.createRange();
		range.setStart(strongText, 0);
		range.setEnd(tail, 1);
		createHighlightRenderer().add(1, range, "yellow");

		expect(root.textContent).toBe("앞강조뒤");
		expect(root.querySelector("[data-webmemo-hl]")?.textContent).toBe("강조뒤");
	});
});
