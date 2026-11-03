import { describe, expect, it } from "vitest";
import {
	formatRetentionDate,
	formatRetentionRange,
} from "./formatRetentionDate";

describe("retention KST dates", () => {
	it("uses the next KST day when an as-of instant crosses UTC 15:00", () => {
		expect(formatRetentionDate("2026-11-03T15:10:00Z", "en")).toBe(
			"Nov 4, 2026",
		);
	});

	it("treats calendar dates as KST dates and subtracts the exclusive end", () => {
		expect(
			formatRetentionRange({ start: "2026-01-01", end: "2026-04-01" }, "en"),
		).toBe("Jan 1, 2026 – Mar 31, 2026");
	});
});
