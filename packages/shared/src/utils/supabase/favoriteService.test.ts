import { describe, expect, it, vi } from "vitest";
import { FavoriteService, isFavoriteDuplicateError } from "./favoriteService";

const createService = () => {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	for (const name of ["insert", "update", "eq", "select", "single"]) {
		chain[name] = vi.fn(() => chain);
	}
	const client = {
		schema: () => ({ from: () => chain }),
	} as never;
	return { service: new FavoriteService(client), chain };
};

describe("isFavoriteDuplicateError", () => {
	it("유니크 제약 위반만 중복으로 본다", () => {
		expect(
			isFavoriteDuplicateError({
				code: "23505",
				message:
					'duplicate key value violates unique constraint "favorite_user_page_key_unique"',
			}),
		).toBe(true);
		expect(
			isFavoriteDuplicateError({ code: "23505", message: "other_unique" }),
		).toBe(false);
		expect(isFavoriteDuplicateError({ code: "42501" })).toBe(false);
		expect(isFavoriteDuplicateError(null)).toBe(false);
	});
});

describe("FavoriteService.addFavorite", () => {
	it("page_key를 계산하고 제목을 trim해 insert한다", async () => {
		const { service, chain } = createService();
		await service.addFavorite({
			userId: "u1",
			url: "https://example.com/a",
			title: "  제목  ",
		});
		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "u1",
				url: "https://example.com/a",
				title: "제목",
				favIconUrl: null,
			}),
		);
	});
});

describe("FavoriteService.updateFavorite", () => {
	it("호스트가 같으면 파비콘을 건드리지 않는다", async () => {
		const { service, chain } = createService();
		await service.updateFavorite(1, {
			url: "https://example.com/b",
			title: " t ",
			previousUrl: "https://example.com/a",
		});
		const payload = chain.update.mock.calls[0][0];
		expect(payload.title).toBe("t");
		expect(payload).not.toHaveProperty("favIconUrl");
		expect(payload.page_key).toBeTruthy();
	});

	it("호스트가 바뀌면 파비콘을 비운다", async () => {
		const { service, chain } = createService();
		await service.updateFavorite(1, {
			url: "https://other.com/b",
			title: "t",
			previousUrl: "https://example.com/a",
		});
		expect(chain.update.mock.calls[0][0].favIconUrl).toBeNull();
	});
});
