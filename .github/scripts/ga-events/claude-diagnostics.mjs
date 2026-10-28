import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const summarizeClaudeExecution = (messages) => {
	const result = Array.isArray(messages)
		? messages.findLast((message) => message?.type === "result")
		: undefined;
	const errors = Array.isArray(result?.errors) ? result.errors : [];
	const error = String(
		(result?.is_error === true && result?.result) ||
			errors
				.map((value) => (typeof value === "string" ? value : value?.message))
				.filter(Boolean)
				.join("; ") ||
			"",
	);
	let message = "Claude error unclassified; raw response omitted";
	if (!result) message = "Claude result unavailable";
	else if (/weekly limit/i.test(error))
		message = "Claude weekly usage limit reached";
	else if (/hit your.*limit|usage limit/i.test(error))
		message = "Claude usage limit reached";
	else if (/rate.limit|too many requests|\b429\b/i.test(error))
		message = "Claude rate limit reached";
	else if (
		/unauthorized|authentication|invalid.*token|expired.*token|\b401\b/i.test(
			error,
		)
	)
		message = "Claude authentication failed";
	else if (/overloaded|\b529\b|\b503\b/i.test(error))
		message = "Claude service unavailable";
	if (/usage limit reached/.test(message)) {
		const reset = error.match(
			/resets?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*\((UTC|GMT)\)/i,
		);
		if (reset) message += `; resets ${reset[1]} (${reset[2].toUpperCase()})`;
	}

	return { isError: result?.is_error === true, message };
};

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
	let summary;
	try {
		const file = process.env.CLAUDE_EXECUTION_FILE;
		if (!file || statSync(file).size > 20 * 1024 * 1024)
			throw new Error("unavailable");
		summary = summarizeClaudeExecution(JSON.parse(readFileSync(file, "utf8")));
	} catch {
		summary = summarizeClaudeExecution([]);
	}
	const json = JSON.stringify(summary);
	console.log(`Claude failure diagnostic: ${json}`);
	writeFileSync(
		path.join(
			process.env.GA_EVENTS_DIR,
			`claude-${process.env.CLAUDE_STAGE}-failure.json`,
		),
		`${json}\n`,
	);
}
