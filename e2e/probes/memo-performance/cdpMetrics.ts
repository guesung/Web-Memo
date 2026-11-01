import type { CDPSession } from "@playwright/test";
import type { Attempt } from "./statistics";

export type Snapshot = Record<string, number>;
type BrowserMetrics = Pick<
	Attempt,
	| "layout_count"
	| "layout_duration_ms"
	| "recalc_style_count"
	| "recalc_style_duration_ms"
	| "script_duration_ms"
	| "task_duration_ms"
	| "end_nodes"
	| "end_js_heap_used_bytes"
>;

const COUNTERS = [
	"LayoutCount",
	"LayoutDuration",
	"RecalcStyleCount",
	"RecalcStyleDuration",
	"ScriptDuration",
	"TaskDuration",
] as const;
const GAUGES = ["Nodes", "JSHeapUsedSize"] as const;

export async function readCdpMetrics(session: CDPSession): Promise<Snapshot> {
	const result = await session.send("Performance.getMetrics");
	const snapshot: Snapshot = {};
	for (const name of [...COUNTERS, ...GAUGES]) {
		const value = result.metrics.find(
			(metric: { name: string; value: number }) => metric.name === name,
		)?.value;
		if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
			throw new Error(`missing_cdp_metric_${name}`);
		snapshot[name] = value;
	}
	return snapshot;
}

export async function retainCdpSample(
	read: () => Promise<Snapshot>,
	previous: Snapshot | null,
	baseline: Snapshot,
): Promise<{ snapshot: Snapshot | null; complete: boolean }> {
	try {
		const snapshot = await read();
		diffCdpMetrics(baseline, snapshot);
		return { snapshot, complete: true };
	} catch {
		return { snapshot: previous, complete: false };
	}
}

export function diffCdpMetrics(start: Snapshot, end: Snapshot): BrowserMetrics {
	const delta = (name: (typeof COUNTERS)[number]) => {
		const value = end[name] - start[name];
		if (!Number.isFinite(value) || value < 0)
			throw new Error(`invalid_cdp_delta_${name}`);
		return value;
	};
	return {
		layout_count: delta("LayoutCount"),
		layout_duration_ms:
			Math.round(delta("LayoutDuration") * 1000 * 1000) / 1000,
		recalc_style_count: delta("RecalcStyleCount"),
		recalc_style_duration_ms:
			Math.round(delta("RecalcStyleDuration") * 1000 * 1000) / 1000,
		script_duration_ms:
			Math.round(delta("ScriptDuration") * 1000 * 1000) / 1000,
		task_duration_ms: Math.round(delta("TaskDuration") * 1000 * 1000) / 1000,
		end_nodes: end.Nodes,
		end_js_heap_used_bytes: end.JSHeapUsedSize,
	};
}
