import { QUERY_KEY } from "./QueryKey";

describe("QUERY_KEY.memosPaginated", () => {
	test("isStar를 키 객체에 포함한다.", () => {
		expect(
			QUERY_KEY.memosPaginated("book", false, "q", "updated_at", true),
		).toStrictEqual([
			"memos",
			"paginated",
			{
				category: "book",
				isWish: false,
				searchQuery: "q",
				sortBy: "updated_at",
				isStar: true,
			},
		]);
	});

	test("isStar를 생략하면 undefined로 둔다.", () => {
		expect(
			QUERY_KEY.memosPaginated("book", false, "q", "updated_at"),
		).toStrictEqual([
			"memos",
			"paginated",
			{
				category: "book",
				isWish: false,
				searchQuery: "q",
				sortBy: "updated_at",
				isStar: undefined,
			},
		]);
	});
});
