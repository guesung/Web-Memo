import { execFileSync, spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = resolve(".github/scripts/deploy/prepareStagingApp.mjs");
let directory = "";
let work = "";
let a = "";
let b = "";
let c = "";

function git(args: string[], cwd = work) {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function commit(value: string) {
	writeFileSync(join(work, "app.txt"), value);
	git(["add", "app.txt", "package.json"]);
	git([
		"-c",
		"user.name=Test",
		"-c",
		"user.email=test@example.com",
		"-c",
		"core.hooksPath=/dev/null",
		"commit",
		"-qm",
		value,
	]);
	return git(["rev-parse", "HEAD"]);
}

function fixture(file: string, key: string, values: unknown[]) {
	writeFileSync(
		join(directory, `${file}.json`),
		JSON.stringify([{ [key]: values }]),
	);
}

function marker(sha: string, expired = false) {
	return {
		name: `staging-app-success-android-${sha}-99-1`,
		expired,
		workflow_run: { head_branch: "develop", head_sha: sha },
	};
}

function run(extraEnv: Record<string, string> = {}, args: string[] = []) {
	return spawnSync(process.execPath, [SCRIPT, ...args], {
		cwd: work,
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${join(directory, "bin")}:${process.env.PATH}`,
			QA_FIXTURES: directory,
			APP_PLATFORM: "android",
			GITHUB_REPOSITORY: "fixture/project",
			GITHUB_RUN_ID: "100",
			GITHUB_RUN_ATTEMPT: "2",
			GITHUB_OUTPUT: join(directory, "output"),
			APP_DEPLOYMENT_DIRECTORY: join(directory, "marker"),
			...extraEnv,
		},
	});
}

function output() {
	return Object.fromEntries(
		readFileSync(join(directory, "output"), "utf8")
			.trim()
			.split("\n")
			.map((line) => line.split("=")),
	);
}

describe("실행권 획득 후 staging 앱 준비 CLI", () => {
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "staging-app-"));
		work = join(directory, "work");
		mkdirSync(work);
		mkdirSync(join(directory, "bin"));
		git(["init", "--bare", "-q", join(directory, "remote")], directory);
		git(["init", "-q"]);
		git(["checkout", "-b", "develop"]);
		writeFileSync(
			join(work, "package.json"),
			'{"devDependencies":{"turbo":"2.1.1"}}',
		);
		a = commit("A");
		b = commit("B");
		c = commit("C");
		git(["remote", "add", "origin", join(directory, "remote")]);
		git(["push", "-q", "origin", "develop"]);
		git(["checkout", "--detach", b]);
		writeFileSync(
			join(directory, "bin/gh"),
			`#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$QA_FIXTURES/calls"
if [ "\u0024{FAIL_API:-}" = true ]; then exit 44; fi
case "$*" in
  *"/jobs?"*) cat "$QA_FIXTURES/jobs.json" ;;
  *"/artifacts?"*) cat "$QA_FIXTURES/artifacts.json" ;;
  *"ci.yml/runs?"*) cat "$QA_FIXTURES/runs.json" ;;
  *) exit 45 ;;
esac
`,
			{ mode: 0o755 },
		);
		writeFileSync(
			join(directory, "bin/npx"),
			`#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$QA_FIXTURES/turbo-calls"
cat "$QA_FIXTURES/packages.json"
`,
			{ mode: 0o755 },
		);
		fixture("runs", "workflow_runs", []);
		fixture("jobs", "jobs", [
			{ name: "ci", conclusion: "success" },
			{ name: "changes", conclusion: "success" },
		]);
		fixture("artifacts", "artifacts", [marker(a)]);
		writeFileSync(
			join(directory, "packages.json"),
			JSON.stringify({ packages: { items: [{ name: "@web-memo/app" }] } }),
		);
	});

	afterEach(() => rmSync(directory, { recursive: true, force: true }));

	it("B가 늦게 진입해도 검증된 C로 승계하고 빌드 부수 효과 없이 생략한다", () => {
		fixture("runs", "workflow_runs", [
			{ id: 101, head_sha: c },
			{ id: 100, head_sha: b },
		]);
		const result = run();
		expect(result.status).toBe(0);
		expect(output()).toMatchObject({
			attempted: "false",
			should_build: "false",
		});
		expect(result.stdout).toContain("더 최신 검증 통과 후보");
	});

	it("최신 C의 ci 실패는 유효 B 배포를 막지 않는다", () => {
		fixture("runs", "workflow_runs", [{ id: 101, head_sha: c }]);
		fixture("jobs", "jobs", [
			{ name: "ci", conclusion: "failure" },
			{ name: "changes", conclusion: "success" },
		]);
		expect(run().status).toBe(0);
		expect(output()).toMatchObject({ attempted: "true", should_build: "true" });
	});

	it("앱 변경이 없는 후보도 미배포 앱 변경을 마지막 앱 성공 SHA부터 다시 판정한다", () => {
		git(["checkout", "--detach", c]);
		expect(run().status).toBe(0);
		expect(output().should_build).toBe("true");
		expect(readFileSync(join(directory, "turbo-calls"), "utf8")).toContain(
			"--affected",
		);
	});

	it("앱 변경이 없으면 알림을 생략하고 성공 marker도 쓰지 않는다", () => {
		writeFileSync(
			join(directory, "packages.json"),
			'{"packages":{"items":[]}}',
		);
		const result = run();
		expect(result.status).toBe(0);
		expect(output()).toMatchObject({
			attempted: "false",
			should_build: "false",
		});
		expect(result.stdout).toContain("앱 변경 없음");
		expect(output()).not.toHaveProperty("marker_name");
	});

	it.each([{ expired: false }, { expired: true }])(
		"성공 이력이 없거나 만료되면 Turbo 판정 없이 전체 빌드한다",
		({ expired }) => {
			const artifacts = expired ? [marker(a, true)] : [];
			fixture("artifacts", "artifacts", artifacts);
			const result = run();
			expect(result.status).toBe(0);
			expect(output().should_build).toBe("true");
			expect(result.stdout).toContain("전체 앱 빌드");
		},
	);

	it("전체 CI가 실패했어도 앱 성공 marker가 있으면 동일/옛 SHA 재배포를 막는다", () => {
		fixture("artifacts", "artifacts", [marker(c)]);
		expect(run().status).toBe(0);
		expect(output().should_build).toBe("false");
	});

	it("조회 오류는 EAS 시작 전에 실패하며 실패 알림과 성공 기준을 보존한다", () => {
		const result = run({ FAIL_API: "true" });
		expect(result.status).toBe(1);
		expect(output()).toMatchObject({
			attempted: "true",
			should_build: "false",
		});
		expect(output()).not.toHaveProperty("marker_name");
	});

	it("다른 계보로 reset되면 옛 후보를 생략한다", () => {
		git(["checkout", "--orphan", "new-develop"]);
		commit("reset");
		git(["push", "-q", "--force", "origin", "HEAD:develop"]);
		git(["checkout", "--detach", b]);
		expect(run().status).toBe(0);
		expect(output().should_build).toBe("false");
	});

	it("성공 기록은 실제 HEAD와 attempt를 사용해 재실행 아티팩트 충돌을 피한다", () => {
		expect(run({}, ["--record"]).status).toBe(0);
		expect(output().marker_name).toBe(`staging-app-success-android-${b}-100-2`);
		expect(
			JSON.parse(
				readFileSync(join(directory, "marker/deployment.json"), "utf8"),
			),
		).toMatchObject({
			sha: b,
			runId: "100",
			attempt: "2",
			platform: "android",
		});
	});
});
