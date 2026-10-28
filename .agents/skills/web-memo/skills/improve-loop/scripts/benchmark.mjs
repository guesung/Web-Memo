import { spawn } from "node:child_process";
import { existsSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const median = (values) => {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? sorted[middle]
		: (sorted[middle - 1] + sorted[middle]) / 2;
};

export function summarize(pairs, minImprovementPercent = 5) {
	if (
		!Number.isFinite(minImprovementPercent) ||
		minImprovementPercent <= 0 ||
		minImprovementPercent >= 100
	) {
		throw new Error("min improvement must be greater than 0 and less than 100");
	}
	if (
		!Array.isArray(pairs) ||
		pairs.length < 7 ||
		pairs.some(
			(pair) =>
				!pair ||
				![pair.baselineMs, pair.candidateMs].every(
					(value) => Number.isFinite(value) && value > 0,
				),
		)
	) {
		throw new Error("at least 7 positive finite paired measurements required");
	}
	const baseline = pairs.map((pair) => pair.baselineMs);
	const candidate = pairs.map((pair) => pair.candidateMs);
	const baselineMedianMs = median(baseline);
	const candidateMedianMs = median(candidate);
	const baselineMadMs = median(
		baseline.map((value) => Math.abs(value - baselineMedianMs)),
	);
	const candidateMadMs = median(
		candidate.map((value) => Math.abs(value - candidateMedianMs)),
	);
	const improvementPercent =
		(100 * (baselineMedianMs - candidateMedianMs)) / baselineMedianMs;
	const pairedImprovementPercent = median(
		pairs.map(
			(pair) => (100 * (pair.baselineMs - pair.candidateMs)) / pair.baselineMs,
		),
	);
	const favorablePairs = pairs.filter(
		(pair) => pair.candidateMs < pair.baselineMs,
	).length;
	const deltaMs = baselineMedianMs - candidateMedianMs;
	const improved =
		improvementPercent >= minImprovementPercent &&
		pairedImprovementPercent >= minImprovementPercent &&
		favorablePairs >= Math.ceil(pairs.length * 0.8) &&
		deltaMs > 2 * Math.max(baselineMadMs, candidateMadMs);
	return {
		status: improved ? "improved" : "inconclusive",
		samples: pairs.length,
		baselineMedianMs,
		candidateMedianMs,
		baselineMadMs,
		candidateMadMs,
		improvementPercent,
		pairedImprovementPercent,
		favorablePairs,
		minImprovementPercent,
	};
}

export function parseArgs(args) {
	const separator = args.indexOf("--");
	if (separator < 0 || !args[separator + 1])
		throw new Error("supply command after --");
	const options = {
		samples: 7,
		warmup: 1,
		timeoutMs: 120000,
		minImprovementPercent: 5,
	};
	const names = {
		"--baseline": "baseline",
		"--candidate": "candidate",
		"--output": "output",
		"--samples": "samples",
		"--warmup": "warmup",
		"--timeout-ms": "timeoutMs",
		"--min-improvement-percent": "minImprovementPercent",
	};
	const numeric = new Set([
		"samples",
		"warmup",
		"timeoutMs",
		"minImprovementPercent",
	]);
	const seen = new Set();
	for (let i = 0; i < separator; i += 2) {
		const key = Object.hasOwn(names, args[i]) ? names[args[i]] : undefined;
		if (!key || seen.has(key) || i + 1 >= separator)
			throw new Error("unknown, duplicate or missing option");
		seen.add(key);
		options[key] = numeric.has(key) ? Number(args[i + 1]) : args[i + 1];
	}
	for (const [key, minimum] of [
		["samples", 7],
		["warmup", 0],
		["timeoutMs", 1],
	]) {
		if (!Number.isSafeInteger(options[key]) || options[key] < minimum)
			throw new Error(`invalid ${key}`);
	}
	if (
		!Number.isFinite(options.minImprovementPercent) ||
		options.minImprovementPercent <= 0 ||
		options.minImprovementPercent >= 100
	) {
		throw new Error("invalid minImprovementPercent");
	}
	if (!options.baseline || !options.candidate || !options.output)
		throw new Error("baseline, candidate and output required");
	options.command = args.slice(separator + 1);
	return options;
}

export async function run(options) {
	if (process.platform === "win32")
		throw new Error("POSIX process groups required");
	if (existsSync(options.output)) throw new Error("output already exists");
	const baseline = realpathSync(options.baseline);
	const candidate = realpathSync(options.candidate);
	if (
		baseline === candidate ||
		!statSync(baseline).isDirectory() ||
		!statSync(candidate).isDirectory()
	) {
		throw new Error("use distinct baseline and candidate directories");
	}
	const measure = async (cwd) => {
		const start = performance.now();
		await new Promise((resolveMeasurement, reject) => {
			const child = spawn(options.command[0], options.command.slice(1), {
				cwd,
				stdio: "ignore",
				shell: false,
				detached: true,
			});
			let timedOut = false;
			let interrupted = null;
			const killGroup = () => {
				if (!child.pid) return;
				try {
					process.kill(-child.pid, "SIGKILL");
				} catch (error) {
					if (error.code !== "ESRCH") throw error;
				}
			};
			const groupExists = () => {
				if (!child.pid) return false;
				try {
					process.kill(-child.pid, 0);
					return true;
				} catch (error) {
					if (error.code !== "ESRCH") throw error;
					return false;
				}
			};
			const onInterrupt = (signal) => {
				interrupted = signal;
				try {
					killGroup();
				} catch (error) {
					reject(error);
				}
			};
			const onSigint = () => onInterrupt("SIGINT");
			const onSigterm = () => onInterrupt("SIGTERM");
			process.once("SIGINT", onSigint);
			process.once("SIGTERM", onSigterm);
			const timer = setTimeout(() => {
				timedOut = true;
				try {
					killGroup();
				} catch (error) {
					reject(error);
				}
			}, options.timeoutMs);
			child.once("error", (error) => {
				clearTimeout(timer);
				reject(new Error(`measurement command failed (${error.code})`));
			});
			child.once("close", (code, signal) => {
				clearTimeout(timer);
				process.removeListener("SIGINT", onSigint);
				process.removeListener("SIGTERM", onSigterm);
				let residual;
				try {
					residual = groupExists();
					killGroup();
				} catch (error) {
					reject(error);
					return;
				}
				if (timedOut || interrupted || residual || code !== 0) {
					reject(
						new Error(
							`measurement command failed (${timedOut ? "ETIMEDOUT" : (interrupted ?? (residual ? "unfinished descendants" : (code ?? signal)))})`,
						),
					);
				} else {
					resolveMeasurement();
				}
			});
		});
		return performance.now() - start;
	};
	for (let i = 0; i < options.warmup; i++) {
		await measure(baseline);
		await measure(candidate);
	}
	const pairs = [];
	for (let i = 0; i < options.samples; i++) {
		const pair = {};
		const order =
			i % 2 === 0 ? ["baseline", "candidate"] : ["candidate", "baseline"];
		for (const version of order)
			pair[`${version}Ms`] = await measure(
				version === "baseline" ? baseline : candidate,
			);
		pairs.push({ order, ...pair });
	}
	const report = {
		schemaVersion: 1,
		metric: "process-wall-time-ms",
		command: options.command,
		nodeVersion: process.version,
		warmup: options.warmup,
		timeoutMs: options.timeoutMs,
		pairs,
		summary: summarize(pairs, options.minImprovementPercent),
	};
	writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, {
		flag: "wx",
	});
	return report;
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		const report = await run(parseArgs(process.argv.slice(2)));
		console.log(JSON.stringify(report.summary));
		process.exitCode = report.summary.status === "improved" ? 0 : 2;
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
