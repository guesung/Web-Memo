import { createClient } from "@supabase/supabase-js";
import { getPageKey } from "../src/utils/Url.ts";

const PAGE_SIZE = 500;
const TABLES = ["memo", "highlight"];

const printUsage = () => {
	console.log(`Usage: node --experimental-strip-types packages/shared/scripts/backfillPageKeys.mjs [--dry-run | --apply]

Reads rows in memo.memo and memo.highlight whose page_key is empty. The default is
--dry-run. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
Run the 20260924_add_page_keys migration before using this script.`);
};

const run = async () => {
	const argumentsList = process.argv.slice(2);
	if (argumentsList.includes("--help")) {
		printUsage();
		return;
	}

	if (argumentsList.some((argument) => !["--dry-run", "--apply"].includes(argument))) {
		printUsage();
		process.exitCode = 2;
		return;
	}

	if (argumentsList.includes("--dry-run") && argumentsList.includes("--apply")) {
		console.error("Choose either --dry-run or --apply.");
		process.exitCode = 2;
		return;
	}

	const supabaseUrl = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) {
		console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
		process.exitCode = 2;
		return;
	}

	const isDryRun = !argumentsList.includes("--apply");
	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	let totalFailures = 0;

	for (const table of TABLES) {
		const summary = { table, mode: isDryRun ? "dry-run" : "apply", scanned: 0, updated: 0, invalid: 0, conflicts: 0, errors: 0 };
		const { data: lastRows, error: lastError } = await supabase
			.schema("memo")
			.from(table)
			.select("id")
			.eq("page_key", "")
			.order("id", { ascending: false })
			.limit(1);
		if (lastError) {
			throw new Error(`${table}: failed to find upper ID: ${lastError.message}`);
		}

		const lastId = lastRows[0]?.id;
		let cursor = 0;
		while (lastId !== undefined) {
			const { data: rows, error: readError } = await supabase
				.schema("memo")
				.from(table)
				.select("id,url,updated_at")
				.eq("page_key", "")
				.gt("id", cursor)
				.lte("id", lastId)
				.order("id", { ascending: true })
				.limit(PAGE_SIZE);
			if (readError) {
				throw new Error(`${table}: failed after ID ${cursor}: ${readError.message}`);
			}
			if (rows.length === 0) {
				break;
			}

			for (const row of rows) {
				cursor = row.id;
				summary.scanned += 1;
				let pageKey;
				try {
					pageKey = getPageKey(row.url);
				} catch {
					summary.invalid += 1;
					console.error(`${table} ID ${row.id}: invalid URL`);
					continue;
				}

				if (isDryRun) {
					continue;
				}

				let update = supabase
					.schema("memo")
					.from(table)
					.update({ page_key: pageKey, updated_at: row.updated_at })
					.eq("id", row.id)
					.eq("url", row.url)
					.eq("page_key", "");
				update = row.updated_at === null
					? update.is("updated_at", null)
					: update.eq("updated_at", row.updated_at);
				const { data: updatedRows, error: updateError } = await update.select("id,url,page_key,updated_at");
				if (updateError) {
					summary.errors += 1;
					console.error(`${table} ID ${row.id}: update failed (${updateError.message})`);
					continue;
				}
				if (updatedRows.length === 0) {
					summary.conflicts += 1;
					console.error(`${table} ID ${row.id}: changed concurrently; skipped`);
					continue;
				}
				if (updatedRows[0].url !== row.url || updatedRows[0].page_key !== pageKey || updatedRows[0].updated_at !== row.updated_at) {
					summary.errors += 1;
					console.error(`${table} ID ${row.id}: updated values differ from the expected URL, page key, or timestamp`);
					continue;
				}
				summary.updated += 1;
			}
		}

		totalFailures += summary.invalid + summary.conflicts + summary.errors;
		console.log(JSON.stringify(summary));
	}

	if (totalFailures > 0) {
		process.exitCode = 1;
	}
};

run().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
