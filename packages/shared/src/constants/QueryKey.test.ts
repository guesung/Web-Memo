import { QUERY_KEY } from "./QueryKey";

describe("QUERY_KEY.memosPaginated", () => {
	test("전달한 필터 조합을 키 객체로 포함한다.", () => {
		expect(
			QUERY_KEY.memosPaginated({
				category: "book",
				isWish: false,
				isStar: true,
				searchQuery: "q",
				searchTarget: "title",
				sortBy: "updated_at",
			}),
		).toStrictEqual([
			"memos",
			"paginated",
			{
				category: "book",
				isWish: false,
				isStar: true,
				searchQuery: "q",
				searchTarget: "title",
				sortBy: "updated_at",
			},
		]);
	});

	test("생략한 필터는 키 객체에 포함되지 않는다.", () => {
		expect(
			QUERY_KEY.memosPaginated({ category: "book", isWish: false }),
		).toStrictEqual([
			"memos",
			"paginated",
			{ category: "book", isWish: false },
		]);
	});
});
