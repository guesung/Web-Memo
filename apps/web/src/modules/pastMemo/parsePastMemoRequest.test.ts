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

	it.each([
		null,
		"문자열",
		{ pageUrl: "https://a.com", pageTitle: "제목" },
		{ pageUrl: 1, pageTitle: "제목", pageExcerpt: "" },
	])("형식이 틀리면 null이다: %j", (body) => {
		expect(parsePastMemoRequest(body)).toBe(null);
	});
});
