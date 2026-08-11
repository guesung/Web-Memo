import { describe, expect, it, vi } from "vitest";

import type { MemoSupabaseClient } from "../types";
import { MemoService } from "./Supabase";

const PAGE_SIZE = 1000;

/**
 * getMemoPage가 사용하는 쿼리 빌더 체인을 흉내낸다.
 * range(from, to) 호출마다 미리 준비한 페이지를 순서대로 돌려준다.
 */
function createMemoClientMock(pages: Array<{ id: number }[]>) {
	const rangeCalls: Array<[number, number]> = [];

	const range = vi.fn((from: number, to: number) => {
		rangeCalls.push([from, to]);
		const pageIndex = Math.floor(from / PAGE_SIZE);
		return Promise.resolve({ data: pages[pageIndex] ?? [], error: null });
	});

	const builder = {
		select: () => builder,
		order: () => builder,
		range,
	};

	const client = {
		schema: () => ({ from: () => builder }),
	} as unknown as MemoSupabaseClient;

	return { client, rangeCalls };
}

function createMemoPage(length: number, startId: number) {
	return Array.from({ length }, (_, index) => ({ id: startId + index }));
}

describe("MemoService.getMemos", () => {
	it("마지막 페이지에 도달할 때까지 순회해 전체 메모를 모은다", async () => {
		const { client, rangeCalls } = createMemoClientMock([
			createMemoPage(PAGE_SIZE, 0),
			createMemoPage(PAGE_SIZE, PAGE_SIZE),
			createMemoPage(120, PAGE_SIZE * 2),
		]);

		const { data, error } = await new MemoService(client).getMemos();

		expect(error).toBeNull();
		expect(data).toHaveLength(PAGE_SIZE * 2 + 120);
		expect(rangeCalls).toEqual([
			[0, 999],
			[1000, 1999],
			[2000, 2999],
		]);
	});

	it("페이지가 가득 차지 않으면 추가 요청을 보내지 않는다", async () => {
		const { client, rangeCalls } = createMemoClientMock([createMemoPage(5, 0)]);

		const { data } = await new MemoService(client).getMemos();

		expect(data).toHaveLength(5);
		expect(rangeCalls).toEqual([[0, 999]]);
	});

	it("메모가 없으면 빈 배열을 돌려준다", async () => {
		const { client } = createMemoClientMock([[]]);

		const { data } = await new MemoService(client).getMemos();

		expect(data).toEqual([]);
	});
});
