import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_STORAGE_QUOTA_BYTES } from "../memoStore/localMemoService";
import {
	LOCAL_HIGHLIGHT_STORAGE_KEY,
	LocalHighlightService,
} from "./localHighlightService";

const stored: Record<string, unknown> = {};
let bytesInUse = 0;

const insertRequest = (url: string, exact = "선택한 문장") => ({
	user_id: "",
	url,
	title: "제목",
	exact_text: exact,
	color: "yellow",
});

describe("LocalHighlightService", () => {
	let service: LocalHighlightService;

	beforeEach(() => {
		for (const key of Object.keys(stored)) delete stored[key];
		bytesInUse = 0;
		vi.stubGlobal("navigator", { locks: undefined });
		vi.stubGlobal("chrome", {
			storage: {
				local: {
					get: vi.fn(async (key: string) => ({ [key]: stored[key] })),
					set: vi.fn(async (items: Record<string, unknown>) => {
						Object.assign(stored, structuredClone(items));
					}),
					getBytesInUse: vi.fn(async () => bytesInUse),
				},
			},
		});
		service = new LocalHighlightService();
	});

	it("insert는 음수 id와 서버 행 모양의 필드를 채워 별도 키에 저장한다", async () => {
		const result = await service.insertHighlight(
			insertRequest("https://a.com/p?utm_source=x"),
		);

		const [highlight] = result.data ?? [];
		expect(result.error).toBeNull();
		expect(highlight.id).toBeLessThan(0);
		expect(highlight).toMatchObject({
			user_id: "",
			page_key: "https://a.com/p",
			note: null,
			exact_text: "선택한 문장",
		});
		expect(stored[LOCAL_HIGHLIGHT_STORAGE_KEY]).toBeDefined();
		expect(stored.guestMemos).toBeUndefined();
	});

	it("지운 id를 다시 쓰지 않는다", async () => {
		const [first] =
			(await service.insertHighlight(insertRequest("https://a.com/p"))).data ??
			[];
		await service.deleteHighlight(first.id);
		const [second] =
			(await service.insertHighlight(insertRequest("https://a.com/p"))).data ??
			[];

		expect(second.id).toBeLessThan(first.id);
	});

	it("getHighlightsByUrl은 같은 페이지 키의 하이라이트만 돌려준다", async () => {
		await service.insertHighlight(insertRequest("https://a.com/p"));
		await service.insertHighlight(insertRequest("https://a.com/other"));

		const { data, error } = await service.getHighlightsByUrl(
			"https://a.com/p?utm_source=x",
		);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0].url).toBe("https://a.com/p");
	});

	it("getHighlightById는 소유자(빈 user_id)가 맞는 행만 돌려준다", async () => {
		const [created] =
			(await service.insertHighlight(insertRequest("https://a.com/p"))).data ??
			[];

		expect(
			(await service.getHighlightById({ id: created.id, userId: "" })).data?.id,
		).toBe(created.id);
		expect(
			(await service.getHighlightById({ id: created.id, userId: "other" }))
				.data,
		).toBeNull();
	});

	it("update는 범위가 맞을 때만 바꾸고 색·메모만 덮어쓴다", async () => {
		const [created] =
			(await service.insertHighlight(insertRequest("https://a.com/p"))).data ??
			[];

		const mismatch = await service.updateHighlight({
			id: created.id,
			request: { note: "메모" },
			scope: { url: "https://a.com/other", userId: "" },
		});
		expect(mismatch.data).toEqual([]);

		const result = await service.updateHighlight({
			id: created.id,
			request: { note: "메모", color: undefined },
			scope: { url: "https://a.com/p", userId: "" },
		});
		expect(result.data?.[0]).toMatchObject({
			id: created.id,
			note: "메모",
			color: "yellow",
		});
	});

	it("delete는 지운 행을 돌려주고 범위가 다르면 지우지 않는다", async () => {
		const [created] =
			(await service.insertHighlight(insertRequest("https://a.com/p"))).data ??
			[];

		expect(
			(
				await service.deleteHighlight(created.id, {
					url: "https://a.com/p",
					userId: "other",
				})
			).data,
		).toEqual([]);
		expect(
			(
				await service.deleteHighlight(created.id, {
					url: "https://a.com/p",
					userId: "",
				})
			).data,
		).toHaveLength(1);
		expect(await service.getAllHighlights()).toEqual([]);
	});

	it("저장 공간이 95% 이상이면 insert를 거부하고 update·delete는 허용한다", async () => {
		const [created] =
			(await service.insertHighlight(insertRequest("https://a.com/p"))).data ??
			[];
		bytesInUse = LOCAL_STORAGE_QUOTA_BYTES * 0.95;

		await expect(
			service.insertHighlight(insertRequest("https://a.com/p2")),
		).rejects.toThrow("저장 공간");
		expect(
			(
				await service.updateHighlight({
					id: created.id,
					request: { note: "n" },
				})
			).data,
		).toHaveLength(1);
		expect((await service.deleteHighlight(created.id)).data).toHaveLength(1);
	});
});
