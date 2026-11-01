import { describe, expect, it } from "vitest";
import { diffCdpMetrics, retainCdpSample } from "./cdpMetrics";

const start = {
	LayoutCount: 2,
	LayoutDuration: 0.1,
	RecalcStyleCount: 3,
	RecalcStyleDuration: 0.2,
	ScriptDuration: 0.3,
	TaskDuration: 0.4,
	Nodes: 10,
	JSHeapUsedSize: 1024,
};

describe("CDP cumulative metric conversion", () => {
	it("converts duration deltas to milliseconds and uses end gauges", () => {
		expect(
			diffCdpMetrics(start, {
				LayoutCount: 5,
				LayoutDuration: 0.104,
				RecalcStyleCount: 7,
				RecalcStyleDuration: 0.206,
				ScriptDuration: 0.308,
				TaskDuration: 0.41,
				Nodes: 20,
				JSHeapUsedSize: 2048,
			}),
		).toEqual({
			layout_count: 3,
			layout_duration_ms: 4,
			recalc_style_count: 4,
			recalc_style_duration_ms: 6,
			script_duration_ms: 8,
			task_duration_ms: 10,
			end_nodes: 20,
			end_js_heap_used_bytes: 2048,
		});
	});
	it("rejects counter resets instead of reporting false low work", () => {
		expect(() => diffCdpMetrics(start, { ...start, LayoutCount: 1 })).toThrow(
			"invalid_cdp_delta_LayoutCount",
		);
	});
	it("retains the last numeric snapshot if the final CDP read fails", async () => {
		const prior = { ...start, LayoutCount: 5 };
		const sample = await retainCdpSample(
			async () => {
				throw new Error("target closed with private details");
			},
			prior,
			start,
		);
		expect(sample).toEqual({ snapshot: prior, complete: false });
		expect(JSON.stringify(sample)).not.toContain("private details");
	});
	it("does not replace a validated page sample with reset counters", async () => {
		const prior = { ...start, LayoutCount: 5 };
		await expect(
			retainCdpSample(async () => ({ ...start, LayoutCount: 1 }), prior, start),
		).resolves.toEqual({ snapshot: prior, complete: false });
	});
});
