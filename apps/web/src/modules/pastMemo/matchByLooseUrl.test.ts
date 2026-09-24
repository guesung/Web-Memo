import { describe, expect, it } from "vitest";
import type { IFRecentMemo } from "./getRecentMemos";
import { matchByLooseUrl } from "./matchByLooseUrl";

const createMemo = (id: number, url: string): IFRecentMemo => ({
	id,
	title: `메모 ${id}`,
	url,
	favIconUrl: null,
	updated_at: null,
});

describe("matchByLooseUrl", () => {
	it("추적 파라미터·www·끝 슬래시만 다른 메모를 같은 글로 찾는다", () => {
		const memos = [
			createMemo(1, "https://other.com/post"),
			createMemo(2, "https://www.blog.com/post/?utm_source=x"),
		];

		expect(
			matchByLooseUrl({ pageUrl: "https://blog.com/post", memos })?.id,
		).toBe(2);
	});

	it("youtu.be 단축 주소와 youtube.com/watch를 같은 영상으로 찾는다", () => {
		const memos = [createMemo(1, "https://www.youtube.com/watch?v=abc&t=10")];

		expect(
			matchByLooseUrl({ pageUrl: "https://youtu.be/abc", memos })?.id,
		).toBe(1);
	});

	it("같은 키가 여럿이면 목록의 가장 앞(가장 최근) 메모를 고른다", () => {
		const memos = [
			createMemo(1, "https://blog.com/post?ref=a"),
			createMemo(2, "https://m.blog.com/post"),
		];

		expect(
			matchByLooseUrl({ pageUrl: "https://blog.com/post", memos })?.id,
		).toBe(1);
	});

	it("경로가 다르면 찾지 않는다", () => {
		const memos = [createMemo(1, "https://blog.com/other")];

		expect(matchByLooseUrl({ pageUrl: "https://blog.com/post", memos })).toBe(
			null,
		);
	});

	it("현재 페이지 URL을 파싱할 수 없으면 null이다", () => {
		const memos = [createMemo(1, "https://blog.com/post")];

		expect(matchByLooseUrl({ pageUrl: "not a url", memos })).toBe(null);
	});
});
