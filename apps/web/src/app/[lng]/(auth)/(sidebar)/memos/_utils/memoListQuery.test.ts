import { QUERY_KEY } from "@web-memo/shared/constants";
import { describe, expect, it } from "vitest";
import { getMemoListQueryParams, getMemoListView } from "./memoListQuery";

const toKey = (params: ReturnType<typeof getMemoListQueryParams>) =>
	QUERY_KEY.memosPaginated(
		params.category,
		params.isWish,
		params.searchQuery,
		params.sortBy,
		params.isStar,
		params.isReading,
		params.domain,
	);

describe("getMemoListQueryParams", () => {
	it("첫 진입의 전체 탭은 예전 목록과 같은 queryKey를 만든다", () => {
		expect(
			toKey(
				getMemoListQueryParams({
					filter: "all",
					category: "",
					view: "grid",
					domainParam: null,
					searchQuery: "",
				}),
			),
		).toStrictEqual(
			QUERY_KEY.memosPaginated(
				"",
				false,
				undefined,
				"updated_at",
				undefined,
				undefined,
				undefined,
			),
		);
	});

	it("탭·보기·도메인을 조회 조건으로 옮긴다", () => {
		expect(
			getMemoListQueryParams({
				filter: "star",
				category: "개발",
				view: "list",
				domainParam: "WWW.Velog.io",
				searchQuery: "react",
			}),
		).toStrictEqual({
			category: "개발",
			sortBy: "created_at",
			isWish: false,
			isStar: true,
			isReading: undefined,
			searchQuery: "react",
			domain: "velog.io",
		});
	});

	it("위시 탭만 위시 메모를 본다", () => {
		const base = {
			category: "",
			view: "grid" as const,
			domainParam: null,
			searchQuery: "",
		};
		expect(getMemoListQueryParams({ ...base, filter: "wish" }).isWish).toBe(
			true,
		);
		expect(
			getMemoListQueryParams({ ...base, filter: "reading" }),
		).toMatchObject({ isWish: false, isReading: true });
	});
});

describe("getMemoListView", () => {
	it.each([
		["list", "list"],
		["domain", "domain"],
		["grid", "grid"],
		[null, "grid"],
		[undefined, "grid"],
		["unknown", "grid"],
	] as const)("%s → %s", (input, expected) => {
		expect(getMemoListView(input)).toBe(expected);
	});
});
