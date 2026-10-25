import { describe, expect, it } from "vitest";
import { parseMemoBody } from "./memoBodyFormat";

describe("parseMemoBody", () => {
	it("줄마다 글머리를 찾는다", () => {
		const lines = parseMemoBody(
			"1. 첫째\n- 둘째\n* 셋째\n• 넷째\n10) 열째\n그냥 문장",
		);

		expect(lines.map((line) => line.marker)).toEqual([
			"1.",
			"-",
			"*",
			"•",
			"10)",
			null,
		]);
	});

	it("글머리 뒤에 공백과 내용이 없으면 글머리로 보지 않는다", () => {
		const lines = parseMemoBody("-마이너스\n2.5배\n- \n-1");

		expect(lines.map((line) => line.marker)).toEqual([null, null, null, null]);
	});

	it("원문 글자를 바꾸지 않는다", () => {
		const text = "- 참고 https://example.com/a 를 보자\n\n끝";
		const restored = parseMemoBody(text)
			.map((line) =>
				line.segments
					.map((segment) =>
						segment.type === "link" ? segment.href : segment.text,
					)
					.join(""),
			)
			.join("\n");

		expect(restored).toBe(text);
	});

	it("빈 줄은 조각이 없는 줄로 남는다", () => {
		expect(parseMemoBody("위\n\n아래")[1]).toEqual({
			marker: null,
			segments: [],
		});
	});

	it("URL을 링크 조각으로 자른다", () => {
		expect(
			parseMemoBody("참고 https://github.com/guesung/Web-Memo/pull/769 확인")[0]
				.segments,
		).toEqual([
			{ type: "text", text: "참고 " },
			{ type: "link", href: "https://github.com/guesung/Web-Memo/pull/769" },
			{ type: "text", text: " 확인" },
		]);
	});

	it("URL 끝에 붙은 문장부호는 링크에서 뺀다", () => {
		expect(parseMemoBody("여기(https://a.com/b). 그리고")[0].segments).toEqual([
			{ type: "text", text: "여기(" },
			{ type: "link", href: "https://a.com/b" },
			{ type: "text", text: "). 그리고" },
		]);
	});

	it("URL 안에 여는 괄호가 있으면 닫는 괄호를 남긴다", () => {
		expect(
			parseMemoBody("https://en.wikipedia.org/wiki/Foo_(bar)")[0].segments,
		).toEqual([
			{ type: "link", href: "https://en.wikipedia.org/wiki/Foo_(bar)" },
		]);
	});

	it("http로 시작하지 않는 글자는 링크로 보지 않는다", () => {
		expect(parseMemoBody("javascript:alert(1) www.a.com")[0].segments).toEqual([
			{ type: "text", text: "javascript:alert(1) www.a.com" },
		]);
	});
});
