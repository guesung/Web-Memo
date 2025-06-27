import { SearchParams } from ".";

describe("SearchParams", () => {
	let searchParams: SearchParams;

	beforeEach(() => {
		searchParams = new SearchParams([
			["id", "5"],
			["id", "10"],
			["category", "book"],
		]);
	});

	describe("get", () => {
		test("key값에 해당하는 값을 1개만 반환한다.", () => {
			expect(searchParams.get("id")).toBe("5");
			expect(searchParams.get("category")).toBe("book");
		});

		test("key값에 해당하는 값이 없다면 빈 문자열을 반환한다.", () => {
			// @ts-expect-error: 테스트 코드를 위해 타입을 무시한다.
			expect(searchParams.get("ids")).toBe("");
		});
	});

	describe("getAll", () => {
		test("key값에 해당하는 값을 배열로 반환한다.", () => {
			expect(searchParams.getAll("id")).toStrictEqual(["5", "10"]);
			expect(searchParams.getAll("category")).toStrictEqual(["book"]);
		});
	});

	describe("add", () => {
		test("key와 value에 해당하는 값을 추가한다.", () => {
			expect(searchParams.add("id", "15"));
			expect(searchParams.add("id", "20"));

			expect(searchParams.getAll("id")).toStrictEqual(["5", "10", "15", "20"]);
		});

		test("key와 value가 모두 중복된다면, 새롭게 추가하지 않는다.", () => {
			expect(searchParams.add("id", "10"));

			expect(searchParams.getAll("id")).toStrictEqual(["5", "10"]);
		});
	});

	describe("remove", () => {
		test("key와 value에 해당하는 값을 제거한다.", () => {
			searchParams.remove("id", "10");

			expect(searchParams.getAll("id")).toStrictEqual(["5"]);
		});

		test("key와 value에 해당하는 값이 없다면 제거하지 않는다..", () => {
			searchParams.remove("id", "15");

			expect(searchParams.getAll("id")).toStrictEqual(["5", "10"]);
		});
	});

	describe("removeAll", () => {
		test("key에 해당하는 모든 값을 제거한다.", () => {
			searchParams.removeAll("id");

			expect(searchParams.getAll("id")).toStrictEqual([]);
		});
	});

	describe("getSearchParams", () => {
		test("SearchParams의 전체 문자열을 얻는다.", () => {
			expect(searchParams.getSearchParams()).toBe("?id=5&id=10&category=book");
		});

		test("파라미터가 없는 경우 빈 문자열을 반환한다.", () => {
			searchParams.removeAll("id");
			searchParams.removeAll("category");
			expect(searchParams.getSearchParams()).toBe("");
		});
	});
});
