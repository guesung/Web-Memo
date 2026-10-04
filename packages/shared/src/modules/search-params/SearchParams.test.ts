import { expectTypeOf } from "vitest";
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

		test("잘못된 view와 searchTarget은 읽지 않고 안전한 기본 화면을 유지한다.", () => {
			const params = new SearchParams([
				["view", "calendar"],
				["view", "list"],
				["searchTarget", "all"],
			]);

			expect(params.get("view")).toBe("");
			expect(params.get("view") === "list").toBe(false);
			expect(params.getAll("view")).toEqual(["list"]);
			expect(params.get("searchTarget")).toBe("");
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

		test("한글, 공백, 앰퍼샌드를 인코딩하고 여러 id 및 알 수 없는 파라미터를 보존한다.", () => {
			const params = new SearchParams([
				["id", "5"],
				["id", "10"],
				["unknown", "원본 & 값"],
			]);
			params.set("category", "한국어 & notes");

			const parsed = new URLSearchParams(params.getSearchParams());
			expect(parsed.getAll("id")).toEqual(["5", "10"]);
			expect(parsed.get("unknown")).toBe("원본 & 값");
			expect(parsed.get("category")).toBe("한국어 & notes");
			expect(params.getSearchParams()).toContain("%26");
			expect(params.getSearchParams()).toContain("+");
		});

		test("알 수 없는 파라미터는 기존 키를 갱신해도 유지한다.", () => {
			const params = new SearchParams([
				["utm_source", "extension"],
				["id", "5"],
				["id", "10"],
			]);
			params.removeAll("id");
			params.set("view", "list");

			expect(params.getSearchParams()).toBe("?utm_source=extension&view=list");
		});
	});

	test("키별 값 타입을 연결한다.", () => {
		expectTypeOf(searchParams.get("view")).toEqualTypeOf<
			"grid" | "list" | ""
		>();
		expectTypeOf(searchParams.getAll("searchTarget")).toEqualTypeOf<
			("memo" | "category")[]
		>();
		searchParams.set("view", "list");
		searchParams.add("searchTarget", "memo");
		const rejectInvalidPairs = (key: "view" | "id") => {
			// @ts-expect-error view 값은 grid 또는 list만 허용한다.
			searchParams.set("view", "calendar");
			// @ts-expect-error searchTarget 값은 memo 또는 category만 허용한다.
			searchParams.add("searchTarget", "all");
			// @ts-expect-error 유니언 키에는 calendar를 유효한 view 값으로 보장할 수 없다.
			searchParams.set(key, "calendar");
			// @ts-expect-error add도 키와 값의 상관관계를 유지한다.
			searchParams.add(key, "calendar");
			// @ts-expect-error remove도 키와 값의 상관관계를 유지한다.
			searchParams.remove(key, "calendar");
		};
		expectTypeOf(rejectInvalidPairs).toBeFunction();
	});
});
