/** Explicit Node --import bootstrap for local synthetic category streaming checks. */
const originalFetch = globalThis.fetch;
const fixture = process.env.WM_DIAG_CATEGORY_FIXTURE;
const delayMs = Number(process.env.WM_DIAG_DELAY_CATEGORY_MS ?? 0);
if (
	!["success", "empty"].includes(fixture) ||
	![0, 3000, 5000].includes(delayMs)
) {
	throw new Error(
		"Set a synthetic category fixture and a supported local delay",
	);
}
const rows =
	fixture === "empty"
		? []
		: [
				{
					id: 91001,
					name: "Streaming category",
					color: null,
					memo_count: 0,
					created_at: "2026-01-01T00:00:00Z",
				},
			];

globalThis.fetch = async function (...args) {
	let isCategory = false;
	try {
		const input = args[0];
		const url = new URL(
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url,
		);
		const method = args[1]?.method ?? input?.method ?? "GET";
		isCategory =
			url.pathname === "/rest/v1/category" && method.toUpperCase() === "GET";
	} catch {}
	if (!isCategory) return originalFetch.apply(this, args);
	const started = Date.now();
	if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
	process.stdout.write(
		`CATEGORY_STREAMING_SERVER ${JSON.stringify({
			started_epoch_ms: started,
			ended_epoch_ms: Date.now(),
			injected_delay_ms: delayMs,
			fixture,
		})}\n`,
	);
	return new Response(JSON.stringify(rows), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
