import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseArgs, summarize } from "./benchmark.mjs";

const pairs = (baseline, candidate) =>
	baseline.map((baselineMs, i) => ({ baselineMs, candidateMs: candidate[i] }));
const constantPairs = (before, after) =>
	pairs(Array(7).fill(before), Array(7).fill(after));

test("repeatable improvement retains raw summary and does not mutate samples", () => {
	const input = constantPairs(100, 80);
	const original = structuredClone(input);
	const result = summarize(input);
	assert.equal(result.status, "improved");
	assert.equal(result.improvementPercent, 20);
	assert.equal(result.favorablePairs, 7);
	assert.deepEqual(input, original);
});

test("no change, regression and below-contract gains stay inconclusive", () => {
	for (const after of [100, 120, 96])
		assert.equal(summarize(constantPairs(100, after)).status, "inconclusive");
	assert.equal(summarize(constantPairs(100, 80), 25).status, "inconclusive");
});

test("one unusually fast sample does not create a claimed improvement", () => {
	assert.equal(
		summarize(pairs(Array(7).fill(100), [1, 100, 100, 100, 100, 100, 100]))
			.status,
		"inconclusive",
	);
});

test("median gains alone do not pass when too many paired measurements regress", () => {
	assert.equal(
		summarize(pairs(Array(7).fill(100), [80, 80, 80, 80, 80, 101, 101])).status,
		"inconclusive",
	);
});

test("large measurement variation prevents a confident gate", () => {
	assert.equal(
		summarize(
			pairs([60, 80, 90, 100, 110, 120, 140], [50, 70, 80, 90, 100, 110, 130]),
		).status,
		"inconclusive",
	);
});

test("invalid, nonfinite or insufficient samples fail closed", () => {
	for (const input of [
		[],
		null,
		constantPairs(100, 0),
		constantPairs(100, NaN),
		constantPairs(Infinity, 80),
		constantPairs(-1, 80),
		Array(7).fill(null),
	]) {
		assert.throws(() => summarize(input));
	}
	for (const threshold of [0, -1, 100, Infinity, NaN])
		assert.throws(() => summarize(constantPairs(100, 80), threshold));
});

const argumentsFor = (...extra) => [
	"--baseline",
	"a",
	"--candidate",
	"b",
	"--output",
	"out.json",
	...extra,
	"--",
	"node",
	"-e",
	"process.exit(0)",
];

test("CLI parsing keeps command arguments separate from its own options", () => {
	const options = parseArgs(argumentsFor("--samples", "9", "--warmup", "0"));
	assert.equal(options.samples, 9);
	assert.equal(options.warmup, 0);
	assert.deepEqual(options.command, ["node", "-e", "process.exit(0)"]);
});

test("CLI rejects missing/duplicate/unknown options and invalid numeric bounds", () => {
	for (const args of [
		[],
		["--"],
		argumentsFor("--baseline", "c"),
		argumentsFor("--unknown", "1"),
		argumentsFor("toString", "x"),
		argumentsFor("--samples", "6"),
		argumentsFor("--samples", "7.5"),
		argumentsFor("--warmup", "-1"),
		argumentsFor("--timeout-ms", "0"),
		argumentsFor("--min-improvement-percent", "NaN"),
		["--baseline", "--", "node"],
	]) {
		assert.throws(() => parseArgs(args));
	}
});

const script = fileURLToPath(new URL("./benchmark.mjs", import.meta.url));
function fixture(t) {
	const root = mkdtempSync(join(tmpdir(), "improve-benchmark-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const baseline = join(root, "baseline");
	const candidate = join(root, "candidate");
	mkdirSync(baseline);
	mkdirSync(candidate);
	return { root, baseline, candidate, output: join(root, "evidence.json") };
}
function cli(f, command, extra = []) {
	return spawnSync(
		process.execPath,
		[
			script,
			"--baseline",
			f.baseline,
			"--candidate",
			f.candidate,
			"--output",
			f.output,
			...extra,
			"--",
			...command,
		],
		{ encoding: "utf8", timeout: 15000 },
	);
}

test("actual CLI executes in both directories, alternates and stores all samples", (t) => {
	const f = fixture(t);
	const command = [
		process.execPath,
		"-e",
		"require('node:fs').appendFileSync('runs.txt', 'run\\n')",
	];
	const result = cli(f, command);
	assert.ok([0, 2].includes(result.status), result.stderr);
	const evidence = JSON.parse(readFileSync(f.output, "utf8"));
	assert.equal(evidence.pairs.length, 7);
	assert.deepEqual(evidence.pairs[0].order, ["baseline", "candidate"]);
	assert.deepEqual(evidence.pairs[1].order, ["candidate", "baseline"]);
	for (const pair of evidence.pairs)
		assert.ok(pair.baselineMs > 0 && pair.candidateMs > 0);
	for (const cwd of [f.baseline, f.candidate])
		assert.equal(
			readFileSync(join(cwd, "runs.txt"), "utf8").trim().split("\n").length,
			8,
		);
	assert.equal(result.status, evidence.summary.status === "improved" ? 0 : 2);
});

test("failed command and timeout produce no success evidence", (t) => {
	const f = fixture(t);
	for (const [command, extra] of [
		[[process.execPath, "-e", "process.exit(3)"], []],
		[
			[process.execPath, "-e", "setTimeout(() => {}, 1000)"],
			["--timeout-ms", "20"],
		],
		[["/nonexistent-improvement-command"], []],
	]) {
		const result = cli(f, command, extra);
		assert.equal(result.status, 1);
		assert.throws(() => readFileSync(f.output));
	}
});

test("same directory and existing output are rejected", (t) => {
	const f = fixture(t);
	const command = [process.execPath, "-e", "process.exit(0)"];
	assert.equal(cli({ ...f, candidate: f.baseline }, command).status, 1);
	writeFileSync(f.output, "preserve");
	assert.equal(cli(f, command, ["--warmup", "0"]).status, 1);
	assert.equal(readFileSync(f.output, "utf8"), "preserve");
});

test("timeout terminates foreground descendants in the measurement process group", async (t) => {
	const f = fixture(t);
	const marker = join(f.root, "orphan.txt");
	const delayed = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'orphan'), 1200)`;
	const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(delayed)}], {stdio:'ignore'}); setTimeout(() => {}, 10000)`;
	const result = cli(
		f,
		[process.execPath, "-e", parent],
		["--timeout-ms", "500"],
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /ETIMEDOUT/);
	await new Promise((resolve) => setTimeout(resolve, 1500));
	assert.throws(() => readFileSync(marker));
	assert.throws(() => readFileSync(f.output));
});

test("parent success while foreground descendants are unfinished fails closed", async (t) => {
	const f = fixture(t);
	const marker = join(f.root, "unfinished.txt");
	const delayed = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'unfinished'), 500)`;
	const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(delayed)}], {stdio:'ignore'}); process.exit(0)`;
	const result = cli(f, [process.execPath, "-e", parent]);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /unfinished descendants/);
	await new Promise((resolve) => setTimeout(resolve, 700));
	assert.throws(() => readFileSync(marker));
	assert.throws(() => readFileSync(f.output));
});
