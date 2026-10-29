import { describe, expect, it, vi } from "vitest";
import { MemoService } from "./memoService";

const createService = () => {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	for (const name of ["insert", "update", "upsert", "eq", "select"]) {
		chain[name] = vi.fn(() => chain);
	}
	const client = {
		schema: () => ({ from: () => chain }),
	} as never;
	return { service: new MemoService(client), chain };
};

describe("MemoService 저장 경로의 NUL 제거", () => {
	it("insertMemo는 문자열 필드의 NUL을 지우고 page_key를 정리된 URL로 계산한다", async () => {
		const { service, chain } = createService();
		await service.insertMemo({
			title: "M28\u0000 계약서.pdf",
			url: "file:///U:/docs/a.pdf\u0000",
			memo: "본문\u0000\u0000",
			favIconUrl: null,
			isWish: false,
		});
		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "M28 계약서.pdf",
				url: "file:///U:/docs/a.pdf",
				memo: "본문",
				favIconUrl: null,
				isWish: false,
				page_key: expect.not.stringContaining("\u0000"),
			}),
		);
	});

	it("updateMemo는 문자열 필드의 NUL을 지운다", async () => {
		const { service, chain } = createService();
		await service.updateMemo({
			id: 1,
			request: { memo: "a\u0000b", isStar: true },
		});
		expect(chain.update).toHaveBeenCalledWith({ memo: "ab", isStar: true });
	});

	it("upsertMemos는 행마다 NUL을 지운다", async () => {
		const { service, chain } = createService();
		await service.upsertMemos([
			{ id: 1, memo: "x\u0000", title: "t", url: "https://a.com" },
		] as never);
		expect(chain.upsert).toHaveBeenCalledWith([
			expect.objectContaining({ memo: "x", title: "t" }),
		]);
	});
});
