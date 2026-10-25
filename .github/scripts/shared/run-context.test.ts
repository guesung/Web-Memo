import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	parseMergeSource,
	readCommitSubject,
	readMergeSource,
} from "./run-context.mjs";

describe("parseMergeSource", () => {
	it("PR 머지 커밋에서 PR 번호와 브랜치를 읽는다", () => {
		expect(
			parseMergeSource(
				"Merge pull request #512 from guesung/fix/ga-extension-client-id",
			),
		).toEqual({
			prNumber: 512,
			branch: "guesung/fix/ga-extension-client-id",
		});
	});

	it("제목 끝의 공백과 개행을 무시한다", () => {
		expect(
			parseMergeSource("Merge pull request #7 from guesung/chore/a\n"),
		).toEqual({ prNumber: 7, branch: "guesung/chore/a" });
	});

	it.each([
		"Merge branch 'chore/nextjs-15-upgrade' into develop",
		"Merge remote-tracking branch 'origin/master' into develop",
		"fix: 확장에서 넘어온 사용자를 웹과 같은 GA 사용자로 집계한다",
		"Merge pull request from guesung/x",
		"",
	])("PR 머지 커밋이 아니면 null이다: %s", (subject) => {
		expect(parseMergeSource(subject)).toBeNull();
	});
});

describe("readMergeSource", () => {
	let repoDir = "";
	let originalCwd = "";

	const git = (...args: string[]) =>
		execFileSync(
			"git",
			["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
			{ cwd: repoDir, encoding: "utf8" },
		).trim();

	beforeAll(() => {
		originalCwd = process.cwd();
		repoDir = mkdtempSync(join(tmpdir(), "run-context-"));
		git("init", "-q");
		git("commit", "--allow-empty", "-q", "-m", "fix: 일반 커밋");
		git(
			"commit",
			"--allow-empty",
			"-q",
			"-m",
			"Merge pull request #512 from guesung/fix/ga",
			"-m",
			"GA 사용자 집계를 고친다",
		);
		process.chdir(repoDir);
	});

	afterAll(() => {
		process.chdir(originalCwd);
		rmSync(repoDir, { recursive: true, force: true });
	});

	it("실제 머지 커밋에서 PR 번호와 브랜치를 읽는다", () => {
		expect(readMergeSource(git("rev-parse", "HEAD"))).toEqual({
			prNumber: 512,
			branch: "guesung/fix/ga",
		});
	});

	it("PR 머지 커밋이 아니면 null이다", () => {
		expect(readMergeSource(git("rev-parse", "HEAD~1"))).toBeNull();
	});

	it("커밋을 못 읽으면 던지지 않고 null이다", () => {
		expect(readMergeSource("0".repeat(40))).toBeNull();
	});

	it("readCommitSubject는 머지 커밋에서 여전히 PR 제목을 돌려준다", () => {
		expect(readCommitSubject(git("rev-parse", "HEAD"))).toBe(
			"GA 사용자 집계를 고친다",
		);
	});
});
