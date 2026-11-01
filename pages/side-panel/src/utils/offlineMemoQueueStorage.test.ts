import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	changeOfflineMemoQueue,
	readOfflineMemoQueue,
} from "./offlineMemoQueueStorage";

const key = "offlineMemoQueue";
let raw: unknown;
let set: ReturnType<typeof vi.fn>;

const legacyItem = {
	userId: "user-a",
	url: "https://example.com/a",
	baseUpdatedAt: null,
	data: {
		title: "title",
		memo: "draft",
		impression: "",
		actionItem: "",
		tabInfo: { title: "tab", url: "https://example.com/a" },
	},
	queuedAt: 1,
};

beforeEach(() => {
	raw = undefined;
	set = vi.fn(async (values: Record<string, unknown>) => {
		raw = values[key];
	});
	vi.stubGlobal("chrome", {
		storage: {
			local: {
				get: async () => ({ [key]: raw }),
				set,
			},
		},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("offline memo queue storage", () => {
	it("Web Locks가 없으면 읽기와 변경을 잠금 없이 진행하지 않는다", async () => {
		vi.stubGlobal("navigator", { locks: undefined });
		raw = [legacyItem];
		await expect(readOfflineMemoQueue()).rejects.toThrow(
			"Web Locks unavailable",
		);
		await expect(
			changeOfflineMemoQueue(() => ({
				items: [],
				result: undefined,
				changed: true,
			})),
		).rejects.toThrow("Web Locks unavailable");
		expect(raw).toEqual([legacyItem]);
		expect(set).not.toHaveBeenCalled();
	});

	it("레거시 revision을 한 번만 부여하고 내용을 보존한다", async () => {
		raw = [legacyItem];
		const first = await readOfflineMemoQueue();
		const second = await readOfflineMemoQueue();
		expect(first[0]).toMatchObject(legacyItem);
		expect(first[0].revision).toEqual(expect.any(String));
		expect(second[0].revision).toBe(first[0].revision);
		expect(set).toHaveBeenCalledTimes(1);
	});

	it("손상 데이터는 읽기와 변경을 거부하고 원본을 보존한다", async () => {
		raw = [legacyItem, { userId: "unknown" }];
		await expect(readOfflineMemoQueue()).rejects.toThrow(
			"Invalid offline memo queue storage",
		);
		await expect(
			changeOfflineMemoQueue(() => ({
				items: [],
				result: undefined,
				changed: true,
			})),
		).rejects.toThrow("Invalid offline memo queue storage");
		expect(raw).toEqual([legacyItem, { userId: "unknown" }]);
		expect(set).not.toHaveBeenCalled();
	});

	it("migration 저장 실패 시 원본을 보존하고 다음 읽기에서 재시도한다", async () => {
		raw = [legacyItem];
		set.mockRejectedValueOnce(new Error("set failed"));
		await expect(readOfflineMemoQueue()).rejects.toThrow("set failed");
		expect(raw).toEqual([legacyItem]);
		expect((await readOfflineMemoQueue())[0].data.memo).toBe("draft");
	});
});
