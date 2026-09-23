import { QueryClient } from "@tanstack/react-query";
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
				isReading: undefined,
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
				isReading: undefined,
			},
		]);
	});
});

describe("QUERY_KEY.highlightsByUrl", () => {
	it("url을 키에 포함한다", () => {
		expect(QUERY_KEY.highlightsByUrl("https://a.com")).toEqual([
			"highlights",
			"byUrl",
			"https://a.com",
		]);
	});
});

describe("QUERY_KEY.highlightsPaginated", () => {
	it("필터 조합을 키에 포함한다", () => {
		expect(QUERY_KEY.highlightsPaginated({ searchQuery: "리액트" })).toEqual([
			"highlights",
			"paginated",
			{ searchQuery: "리액트" },
		]);
	});
});

describe("QUERY_KEY.highlightCounts", () => {
	it("URL 배열을 키에 포함한다", () => {
		expect(QUERY_KEY.highlightCounts(["https://a.com"])).toEqual([
			"highlights",
			"counts",
			["https://a.com"],
		]);
	});

	it("URL 순서가 달라도 같은 키를 만든다", () => {
		const first = QUERY_KEY.highlightCounts(["https://b.com", "https://a.com"]);
		const second = QUERY_KEY.highlightCounts([
			"https://a.com",
			"https://b.com",
		]);

		expect(first).toEqual(second);
	});

	it("원본 배열을 변형하지 않는다", () => {
		const urls = ["https://b.com", "https://a.com"];
		QUERY_KEY.highlightCounts(urls);

		expect(urls).toEqual(["https://b.com", "https://a.com"]);
	});
});

describe("QUERY_KEY.highlightCountsPrefix", () => {
	it("highlightCounts의 접두사와 일치한다", () => {
		expect(QUERY_KEY.highlightCountsPrefix()).toEqual(["highlights", "counts"]);
		expect(QUERY_KEY.highlightCounts(["https://a.com"]).slice(0, 2)).toEqual(
			QUERY_KEY.highlightCountsPrefix(),
		);
	});
});

describe("대시보드 통계 쿼리 키", () => {
	it("includeAdmin 값이 다르면 키가 다르다", () => {
		expect(QUERY_KEY.adminStats(true)).not.toEqual(QUERY_KEY.adminStats(false));
		expect(QUERY_KEY.activeUsersStats(true)).not.toEqual(
			QUERY_KEY.activeUsersStats(false),
		);
		expect(QUERY_KEY.userGrowth(30, true)).not.toEqual(
			QUERY_KEY.userGrowth(30, false),
		);
	});

	it("includeAdmin을 생략하면 false와 같은 키다", () => {
		expect(QUERY_KEY.adminStats()).toEqual(QUERY_KEY.adminStats(false));
		expect(QUERY_KEY.activeUsersStats()).toEqual(
			QUERY_KEY.activeUsersStats(false),
		);
		expect(QUERY_KEY.userGrowth(30)).toEqual(QUERY_KEY.userGrowth(30, false));
	});

	it("userGrowth는 기간이 달라도 키가 다르다", () => {
		expect(QUERY_KEY.userGrowth(7, true)).not.toEqual(
			QUERY_KEY.userGrowth(30, true),
		);
	});
});

describe("QUERY_KEY.memosPaginatedPrefix", () => {
	it("모든 목록 필터를 무효화하고 휴지통 캐시는 유지한다", async () => {
		const queryClient = new QueryClient();
		const unfilteredKey = QUERY_KEY.memosPaginated();
		const filteredKey = QUERY_KEY.memosPaginated(
			"book",
			true,
			"query",
			"title",
			true,
			true,
		);
		const deletedKey = QUERY_KEY.deletedMemos();
		for (const key of [unfilteredKey, filteredKey, deletedKey]) {
			queryClient.setQueryData(key, []);
		}

		await queryClient.invalidateQueries({
			queryKey: QUERY_KEY.memosPaginatedPrefix(),
		});

		expect(queryClient.getQueryState(unfilteredKey)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(filteredKey)?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(deletedKey)?.isInvalidated).toBe(false);
		queryClient.clear();
	});
});
