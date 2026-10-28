import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
	FullResult,
	Reporter,
	TestCase,
	TestResult,
} from "@playwright/test/reporter";
import {
	type Attempt,
	countCdpSamples,
	sanitizeAttempt,
	summarizeByCondition,
} from "./statistics";

/** Default reporters can print URLs, DOM, credentials, and mock-guard request queries. */
export default class SafeReporter implements Reporter {
	private readonly attempts: Attempt[] = [];
	private passed = 0;
	private failed = 0;
	private blocked = 0;
	private invalid = 0;
	private runnerError = false;
	private readonly failures: {
		scenario: string | null;
		reason: "setup_blocked" | "scenario_assertion";
		stage: string | null;
	}[] = [];

	onTestEnd(test: TestCase, result: TestResult) {
		const setup = test.parent.project()?.name === "setup";
		if (result.status === "passed") this.passed++;
		else if (setup || result.status === "skipped") this.blocked++;
		else this.failed++;
		if (result.status !== "passed" && result.status !== "skipped") {
			const match =
				/^(all|star|wish|reading)_(hard|reload|warm|internal|slow|list|domain|search|filter|category|view|load_more|cache|rapid|error|next_error|timeout|delay)_(0|20|21|200|2000) sample \d+$/.exec(
					test.title,
				);
			this.failures.push({
				scenario: match ? `${match[1]}_${match[2]}_${match[3]}` : null,
				reason: setup ? "setup_blocked" : "scenario_assertion",
				stage:
					[...test.annotations]
						.reverse()
						.find(
							(annotation) =>
								annotation.type === "memo-performance-stage" &&
								[
									"seed",
									"mocks",
									"initial",
									"prepare",
									"action",
									"ready",
									"record",
								].includes(annotation.description ?? ""),
						)?.description ?? null,
			});
		}
		for (const annotation of test.annotations) {
			if (annotation.type !== "memo-performance-attempt") continue;
			try {
				const attempt = sanitizeAttempt(
					JSON.parse(annotation.description ?? "null"),
				);
				if (attempt) this.attempts.push(attempt);
				else this.invalid++;
			} catch {
				this.invalid++;
			}
		}
	}

	onError() {
		this.runnerError = true;
	}
	onStdOut() {}
	onStdErr() {}

	async onEnd(result: FullResult) {
		const cdpSamples = countCdpSamples(this.attempts);
		const measurementFailed = this.invalid > 0 || cdpSamples.failed > 0;
		let revision = "unknown";
		try {
			const sha = execFileSync("git", ["rev-parse", "HEAD"], {
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim();
			if (/^[a-f0-9]{40}$/.test(sha)) revision = sha;
		} catch {
			/* Revision is optional when running outside a checkout. */
		}
		const report = {
			schema_version: 3,
			measurement_version: 3,
			measurement_window:
				"CDP counters are sampled before the action, after each validated load-more page, and after DOM validation plus bounded auxiliary-request settling. A failed final read retains the last successful sample and sets cdp_sample_complete=false. Sample elapsed time and item count identify its endpoint; null metrics mean only the baseline was read. Rapid cancellation and its follow-up use separate counter windows. End node and heap gauges are sampled at the reported endpoint.",
			timing_relationship:
				"duration_ms, validation_ms, trigger_total_ms, settle_ms, request_wait_ms, and CDP durations overlap; they are not additive. All v3 cells use the same Performance.enable/getMetrics instrumentation. Cell browser_metrics include complete CDP samples only; partial samples remain in attempts.",
			source: "mock",
			revision,
			status: measurementFailed ? "failed" : result.status,
			passed: this.passed,
			failed: this.failed,
			blocked: this.blocked,
			invalid_annotations: this.invalid,
			partial_cdp_samples: cdpSamples.partial,
			failed_cdp_measurements: cdpSamples.failed,
			timeout_partial_cdp_samples: cdpSamples.timeout_partial,
			blocked_reason: this.blocked
				? "authentication_or_dependency"
				: this.runnerError
					? "runner_or_preview"
					: null,
			failure_reason: this.failed
				? "scenario_assertion"
				: this.invalid
					? "invalid_annotation"
					: cdpSamples.failed
						? "incomplete_cdp_measurement"
						: null,
			failures: this.failures,
			server_cache: "unknown",
			content_metric: "observed_content_ready",
			attempts: this.attempts,
			cells: summarizeByCondition(this.attempts),
		};
		const output = path.resolve(__dirname, "../../.memo-performance");
		mkdirSync(output, { recursive: true });
		writeFileSync(
			path.join(output, "report.json"),
			`${JSON.stringify(report, null, 2)}\n`,
		);
		process.stdout.write(
			`memo performance probe: ${report.status}; passed=${this.passed}; failed=${this.failed}; blocked=${this.blocked}; invalid=${this.invalid}\n`,
		);
		return { status: measurementFailed ? ("failed" as const) : result.status };
	}
}
