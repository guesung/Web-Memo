import { describe, expect, it } from "vitest";
import { parsePastMemoRequest } from "./parsePastMemoRequest";

describe("parsePastMemoRequest", () => {
	it("세 필드가 문자열이면 그대로 돌려준다", () => {
		const body = {
			pageUrl: "https://a.com",
			pageTitle: "제목",
			pageExcerpt: "",
		};

		expect(parsePastMemoRequest(body)).toEqual(body);
	});

	it("pageExcerpt가 1,000자를 넘으면 1,000자로 자른다", () => {
		const result = parsePastMemoRequest({
			pageUrl: "https://a.com",
			pageTitle: "제목",
			pageExcerpt: "가".repeat(1500),
		});

		expect(result?.pageExcerpt).toHaveLength(1000);
	});

	it("1,000번째 경계에 이모지가 걸려도 짝 없는 서로게이트를 남기지 않는다", () => {
		const result = parsePastMemoRequest({
			pageUrl: "https://a.com",
			pageTitle: "제목",
			pageExcerpt: `${"가".repeat(999)}😀${"나".repeat(10)}`,
		});

		expect(result?.pageExcerpt.isWellFormed()).toBe(true);
		expect(Array.from(result?.pageExcerpt ?? "")).toHaveLength(1000);
		expect(result?.pageExcerpt.endsWith("😀")).toBe(true);
	});

	it("이모지 1,000개도 코드 포인트 단위로 자른다", () => {
		const result = parsePastMemoRequest({
			pageUrl: "https://a.com",
			pageTitle: "제목",
			pageExcerpt: "😀".repeat(1500),
		});

		expect(result?.pageExcerpt).toBe("😀".repeat(1000));
	});

	it("짝 없는 서로게이트를 U+FFFD로 바꾼다", () => {
		const result = parsePastMemoRequest({
			pageUrl: "https://a.com/\uD83D",
			pageTitle: "a\uDE00b",
			pageExcerpt: "x\uD83D",
		});

		expect(result).toEqual({
			pageUrl: "https://a.com/\uFFFD",
			pageTitle: "a\uFFFDb",
			pageExcerpt: "x\uFFFD",
		});
	});

	it("세 필드의 NUL을 지운다", () => {
		const result = parsePastMemoRequest({
			pageUrl: "file:///a.pdf\u0000",
			pageTitle: "M28\u0000 계약서",
			pageExcerpt: "본문\u0000\u0000",
		});

		expect(result).toEqual({
			pageUrl: "file:///a.pdf",
			pageTitle: "M28 계약서",
			pageExcerpt: "본문",
		});
	});

	it.each([
		null,
		"문자열",
		{ pageUrl: "https://a.com", pageTitle: "제목" },
		{ pageUrl: 1, pageTitle: "제목", pageExcerpt: "" },
	])("형식이 틀리면 null이다: %j", (body) => {
		expect(parsePastMemoRequest(body)).toBe(null);
	});
});
