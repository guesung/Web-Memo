import { describe, expect, it } from "vitest";
import type { MemoSupabaseClient } from "../types";
import { HighlightService } from "./Supabase";

/** 가짜 빌더가 기록한 호출 인자 */
interface RecordedCalls {
	schema: string[];
	from: string[];
	select: string[];
	eq: [string, unknown][];
	or: string[];
	order: [string, unknown][];
	limit: number[];
}

/**
 * Supabase 쿼리 빌더를 흉내 내는 최소 목.
 * @description 체이닝 메서드는 자기 자신을 돌려주고, await 되는 시점에 빈 결과를 반환한다.
 * HighlightService가 실제로 쓰는 메서드만 구현한다.
 */
function createMockClient(): { client: MemoSupabaseClient; calls: RecordedCalls } {
	const calls: RecordedCalls = {
		schema: [],
		from: [],
		select: [],
		eq: [],
		or: [],
		order: [],
		limit: [],
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
			};
		},
	} as unknown as MemoSupabaseClient;

	return { client, calls };
}

describe("HighlightService.getHighlightsPaginated", () => {
	it("검색어가 있으면 exact_text와 note를 대상으로 필터를 건다", async () => {
		const { client, calls } = createMockClient();
		await new HighlightService(client).getHighlightsPaginated({
			searchQuery: "리액트",
		});

		expect(calls.or).toContainEqual(
			expect.stringContaining("exact_text.ilike.%리액트%"),
		);
		expect(calls.or).toContainEqual(expect.stringContaining("note.ilike.%리액트%"));
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
		await new HighlightService(client).getHighlightsPaginated({ color: "yellow" });

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
