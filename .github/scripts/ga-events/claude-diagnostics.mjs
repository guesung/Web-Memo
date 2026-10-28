import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const summarizeClaudeExecution = (messages, secrets = []) => {
	const result = Array.isArray(messages) ? messages.findLast((message) => message?.type === "result") : undefined;
	const error = result?.result || result?.errors?.map((value) => typeof value === "string" ? value : value?.message).filter(Boolean).join("; ") || "Claude result unavailable";
	let message = String(error);
	for (const secret of secrets.filter((value) => typeof value === "string" && value.length >= 8)) {
		message = message.split(secret).join("<REDACTED>");
	}
	message = message.replace(/\b(?:sk-ant-|sk-|gho_|ghp_|github_pat_)[a-zA-Z0-9_-]+/g, "<REDACTED>").replace(/Bearer\s+\S+/gi, "Bearer <REDACTED>").slice(0, 2000);

	return { subtype: result?.subtype ?? "unknown", isError: result?.is_error === true, turns: result?.num_turns ?? 0, message };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	let summary;
	try {
		const file = process.env.CLAUDE_EXECUTION_FILE;
		if (!file || statSync(file).size > 20 * 1024 * 1024) throw new Error("unavailable");
		const secrets = Object.entries(process.env).filter(([name]) => /TOKEN|SECRET|PASSWORD|KEY|WEBHOOK/.test(name)).map(([, value]) => value);
		summary = summarizeClaudeExecution(JSON.parse(readFileSync(file, "utf8")), secrets);
	} catch {
		summary = summarizeClaudeExecution([]);
	}
	const diagnostic = { stage: process.env.CLAUDE_STAGE, ...summary };
	const json = JSON.stringify(diagnostic);
	console.log(`Claude failure diagnostic: ${json}`);
	writeFileSync(path.join(process.env.GA_EVENTS_DIR, `claude-${process.env.CLAUDE_STAGE}-failure.json`), `${json}\n`);
}
