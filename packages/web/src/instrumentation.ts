export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./sentry.server.config");
	}

	if (process.env.NEXT_RUNTIME === "edge") {
		await import("./sentry.edge.config");
	}

	if (process.env.NEXT_RUNTIME === "server") {
		await import("./sentry.server.config");
	}
}
