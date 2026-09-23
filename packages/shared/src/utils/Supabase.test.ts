import { describe, expect, it } from "vitest";
import type { MemoSupabaseClient } from "../types";
import { HighlightService, MemoService } from "./Supabase";

/** 가짜 빌더가 기록한 호출 인자 */
interface IFRecordedCalls {
	schema: string[];
	from: string[];
	select: string[];
	eq: [string, unknown][];
	is: [string, unknown][];
	lt: [string, unknown][];
	gt: [string, unknown][];
	or: string[];
	order: [string, unknown][];
	limit: number[];
	rpc: [string, unknown][];
}

/**
 * Supabase 쿼리 빌더를 흉내 내는 최소 목.
 * @description 체이닝 메서드는 자기 자신을 돌려주고, await 되는 시점에 빈 결과를 반환한다.
 * 서비스가 실제로 쓰는 메서드만 구현한다.
 */
const createMockClient = (): {
	client: MemoSupabaseClient;
	calls: IFRecordedCalls;
} => {
	const calls: IFRecordedCalls = {
		schema: [],
		from: [],
		select: [],
		eq: [],
		is: [],
		lt: [],
		gt: [],
		or: [],
		order: [],
		limit: [],
		rpc: [],
	};

	const builder = {
		select: (columns: string) => {
			calls.select.push(columns);
			return builder;
		},
		eq: (column: string, value: unknown) => {
			calls.eq.push([column, value]);
			return builder;
		},
		is: (column: string, value: unknown) => {
			calls.is.push([column, value]);

			return builder;
		},
		lt: (column: string, value: unknown) => {
			calls.lt.push([column, value]);

			return builder;
		},
		gt: (column: string, value: unknown) => {
			calls.gt.push([column, value]);

			return builder;
		},
		or: (filter: string) => {
			calls.or.push(filter);
			return builder;
		},
		order: (column: string, options: unknown) => {
			calls.order.push([column, options]);
			return builder;
		},
		limit: (count: number) => {
			calls.limit.push(count);
			return builder;
		},
		insert: () => builder,
		update: () => builder,
		delete: () => builder,
		/** await 되면 빈 결과를 준다. 이 테스트는 반환값이 아니라 전달 인자를 검증한다. */
		// biome-ignore lint/suspicious/noThenProperty: Supabase 쿼리 빌더는 실제로 thenable이라 await 가능해야 하는 목이다.
		then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
			resolve({ data: [], error: null }),
	};

	const client = {
		schema: (name: string) => {
			calls.schema.push(name);
			return {
				from: (table: string) => {
					calls.from.push(table);
					return builder;
				},
				rpc: (fn: string, params: unknown) => {
					calls.rpc.push([fn, params]);
					return builder;
				},
			};
		},
	} as unknown as MemoSupabaseClient;

	return { client, calls };
};

describe("HighlightService.getHighlightsPaginated", () => {
	it("검색어가 있으면 exact_text와 note를 대상으로 필터를 건다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({
			searchQuery: "리액트",
		});

		expect(calls.or).toContainEqual(
			expect.stringContaining("exact_text.ilike.%리액트%"),
		);
		expect(calls.or).toContainEqual(
			expect.stringContaining("note.ilike.%리액트%"),
		);
	});

	it("커서가 있으면 (created_at, id) 복합 조건으로 다음 페이지를 요청한다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({
			cursor: { value: "2026-08-15T00:00:00Z", id: 42 },
		});

		expect(calls.or).toContainEqual(
			"created_at.lt.2026-08-15T00:00:00Z,and(created_at.eq.2026-08-15T00:00:00Z,id.lt.42)",
		);
	});

	it("색상 필터가 있으면 color로 eq 조건을 건다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({
			color: "yellow",
		});

		expect(calls.eq).toContainEqual(["color", "yellow"]);
	});

	it("정렬은 created_at 내림차순 뒤에 id 내림차순을 보조로 건다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({});

		expect(calls.order.map(([column]) => column)).toEqual(["created_at", "id"]);
	});

	it("limit을 주지 않으면 기본값 20을 쓴다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({});

		expect(calls.limit).toContainEqual(20);
	});
});

describe("HighlightService.getHighlightsByUrl", () => {
	it("url로 조회하고 id 오름차순으로 정렬한다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsByUrl("https://a.com");

		expect(calls.eq).toContainEqual(["url", "https://a.com"]);
		expect(calls.order).toContainEqual(["id", { ascending: true }]);
	});
});

describe("HighlightService.getHighlightCounts", () => {
	it("URL 배열을 target_urls 파라미터로 넘긴다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightCounts([
			"https://a.com",
			"https://b.com",
		]);

		expect(calls.rpc).toContainEqual([
			"get_highlight_counts",
			{ target_urls: ["https://a.com", "https://b.com"] },
		]);
	});

	it("memo 스키마에서 호출한다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightCounts(["https://a.com"]);

		expect(calls.schema).toContain("memo");
	});
});

describe("MemoService.getMemosPaginated", () => {
	it.each(["created_at", "updated_at"] as const)(
		"%s가 같은 메모를 누락하지 않도록 id까지 비교한다",
		async (sortBy) => {
			const { client, calls } = createMockClient();
			await new MemoService(client).getMemosPaginated({
				sortBy,
				cursor: { value: "2026-09-23T01:02:03.123456+00:00", id: 42 },
			});

			expect(calls.or).toEqual([
				`${sortBy}.lt."2026-09-23T01:02:03.123456+00:00",and(${sortBy}.eq."2026-09-23T01:02:03.123456+00:00",id.lt.42)`,
			]);
			expect(calls.order).toEqual([
				[sortBy, { ascending: false }],
				["id", { ascending: false }],
			]);
			expect(calls.lt).toEqual([]);
		},
	);

	it("검색과 필터를 커서 조건에 함께 적용하고 휴지통 메모를 제외한다", async () => {
		const { client, calls } = createMockClient();
		await new MemoService(client).getMemosPaginated({
			sortBy: "created_at",
			cursor: { value: "2026-09-23T00:00:00Z", id: 42 },
			searchQuery: "리액트",
			category: "개발",
			isWish: true,
			isStar: false,
			isReading: true,
		});

		expect(calls.or).toHaveLength(2);
		expect(calls.or[1]).toContain("title.ilike.%리액트%");
		expect(calls.select).toEqual(["*, category!inner(id, name, color)"]);
		expect(calls.eq).toEqual([
			["isWish", true],
			["isStar", false],
			["isReading", true],
			["category.name", "개발"],
		]);
		expect(calls.is).toEqual([["deleted_at", null]]);
	});

	it("첫 페이지는 커서 필터 없이 최신 수정순 20건을 조회한다", async () => {
		const { client, calls } = createMockClient();
		await new MemoService(client).getMemosPaginated({});

		expect(calls.or).toEqual([]);
		expect(calls.order).toEqual([
			["updated_at", { ascending: false }],
			["id", { ascending: false }],
		]);
		expect(calls.limit).toEqual([20]);
	});

	it("기존 모바일 문자열 날짜 커서를 계속 지원한다", async () => {
		const { client, calls } = createMockClient();
		await new MemoService(client).getMemosPaginated({ cursor: "2026-09-23" });

		expect(calls.lt).toEqual([["updated_at", "2026-09-23"]]);
	});

	it("제목 정렬의 문자열 커서는 오름차순으로 조회한다", async () => {
		const { client, calls } = createMockClient();
		await new MemoService(client).getMemosPaginated({
			sortBy: "title",
			cursor: "메모 제목",
		});

		expect(calls.gt).toEqual([["title", "메모 제목"]]);
		expect(calls.order).toEqual([
			["title", { ascending: true }],
			["id", { ascending: true }],
		]);
	});
});
