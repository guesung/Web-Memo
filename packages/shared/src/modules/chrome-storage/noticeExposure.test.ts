import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	claimNoticeReturns,
	recordFirstNoticeExposure,
} from "./noticeExposure";

const storageKey = (id: number) => `noticeFirstExposure:${id}`;
let stored: Record<string, unknown>;
let get: ReturnType<typeof vi.fn>;
let set: ReturnType<typeof vi.fn>;

beforeEach(() => {
	stored = {};
	get = vi.fn(async (key: string | null) =>
		key === null
			? structuredClone(stored)
			: { [key]: structuredClone(stored[key]) },
	);
	set = vi.fn(async (values: Record<string, unknown>) => {
		stored = { ...stored, ...structuredClone(values) };
	});
	vi.stubGlobal("chrome", { storage: { local: { get, set } } });
});

afterEach(() => vi.unstubAllGlobals());

describe("notice exposure tracking", () => {
	it("keeps the first KST date per notice across repeated views", async () => {
		await recordFirstNoticeExposure({
			noticeId: 1,
			now: new Date("2026-10-01T14:59:00Z"),
		});
		await recordFirstNoticeExposure({
			noticeId: 1,
			now: new Date("2026-10-03T00:00:00Z"),
		});
		await recordFirstNoticeExposure({
			noticeId: 2,
			now: new Date("2026-10-03T00:00:00Z"),
		});

		expect(stored[storageKey(1)]).toEqual({
			firstViewedDate: "2026-10-01",
			returnAttempted: false,
		});
		expect(stored[storageKey(2)]).toEqual({
			firstViewedDate: "2026-10-03",
			returnAttempted: false,
		});
	});

	it("preserves separate notices when first views race", async () => {
		await Promise.all([
			recordFirstNoticeExposure({ noticeId: 1 }),
			recordFirstNoticeExposure({ noticeId: 2 }),
		]);
		expect(Object.keys(stored).sort()).toEqual([storageKey(1), storageKey(2)]);
	});

	it("counts KST D1 and D7, but excludes D0 and D8", async () => {
		await recordFirstNoticeExposure({
			noticeId: 1,
			now: new Date("2026-10-01T14:59:00Z"),
		});
		expect(
			await claimNoticeReturns({ now: new Date("2026-10-01T14:59:59Z") }),
		).toEqual([]);
		expect(
			await claimNoticeReturns({ now: new Date("2026-10-01T15:00:00Z") }),
		).toEqual([{ noticeId: 1, daysSinceView: 1 }]);

		await recordFirstNoticeExposure({
			noticeId: 2,
			now: new Date("2026-10-01T14:59:00Z"),
		});
		expect(
			await claimNoticeReturns({ now: new Date("2026-10-08T14:59:59Z") }),
		).toEqual([{ noticeId: 2, daysSinceView: 7 }]);

		await recordFirstNoticeExposure({
			noticeId: 3,
			now: new Date("2026-10-01T14:59:00Z"),
		});
		expect(
			await claimNoticeReturns({ now: new Date("2026-10-08T15:00:00Z") }),
		).toEqual([]);
	});

	it("records only the first ordinary return attempt", async () => {
		await recordFirstNoticeExposure({
			noticeId: 7,
			now: new Date("2026-10-01T00:00:00Z"),
		});
		const now = new Date("2026-10-02T00:00:00Z");
		expect(await claimNoticeReturns({ now })).toHaveLength(1);
		expect(await claimNoticeReturns({ now })).toEqual([]);
	});

	it("does not return a claim when local storage cannot persist its marker", async () => {
		await recordFirstNoticeExposure({
			noticeId: 7,
			now: new Date("2026-10-01T00:00:00Z"),
		});
		set.mockRejectedValueOnce(new Error("storage unavailable"));
		await expect(
			claimNoticeReturns({ now: new Date("2026-10-02T00:00:00Z") }),
		).rejects.toThrow("storage unavailable");
	});

	it("does not erase a malformed first exposure record", async () => {
		stored[storageKey(7)] = {
			firstViewedDate: "bad-date",
			returnAttempted: false,
		};
		await expect(recordFirstNoticeExposure({ noticeId: 7 })).rejects.toThrow(
			"형식",
		);
		await expect(claimNoticeReturns()).rejects.toThrow("형식");
		expect(set).not.toHaveBeenCalled();
		expect(stored[storageKey(7)]).toEqual({
			firstViewedDate: "bad-date",
			returnAttempted: false,
		});
	});
});
