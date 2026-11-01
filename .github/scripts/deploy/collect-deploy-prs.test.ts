import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	classifyRange,
	collectDeployPrs,
	parseMergeLog,
} from "./collect-deploy-prs.mjs";

const RS = "\u001e";
const US = "\u001f";

let repo = "";

const git = (...args: string[]) =>
	execFileSync(
		"git",
		[
			"-c",
			"user.name=Test",
			"-c",
			"user.email=test@example.com",
			"-c",
			"core.hooksPath=/dev/null",
			"-c",
			"commit.gpgsign=false",
			...args,
		],
		{ cwd: repo, encoding: "utf8" },
	).trim();

const commitFile = (name: string, message: string) => {
	writeFileSync(join(repo, name), message);
	git("add", name);
	git("commit", "-qm", message);

	return git("rev-parse", "HEAD");
};

/** 브랜치에서 파일 하나를 커밋하고 GitHub 형식의 머지 커밋으로 master에 합친다. */
const mergePr = (number: number, branch: string, title: string) => {
	git("checkout", "-q", "-b", `pr-${number}`);
	commitFile(`pr-${number}.txt`, `pr ${number}`);
	git("checkout", "-q", "master");
	git(
		"merge",
		"--no-ff",
		"-q",
		`pr-${number}`,
		"-m",
		`Merge pull request #${number} from ${branch}`,
		"-m",
		title,
	);

	return git("rev-parse", "HEAD");
};

const affectedBy =
	(table: Record<string, Partial<Record<string, boolean>>>) =>
	({ headRef }: { headRef: string }) => ({
		app: false,
		extension: false,
		web: false,
		...table[headRef],
	});

let base = "";
let merge1 = "";
let merge2 = "";
let merge3 = "";
let nextVersion = "";

beforeAll(() => {
	repo = mkdtempSync(join(tmpdir(), "collect-prs-"));
	execFileSync("git", ["init", "-q", "-b", "master"], { cwd: repo });
	base = commitFile("README.md", "initial");
	merge1 = mergePr(1, "guesung/feat/a", "A 기능 추가");
	merge2 = mergePr(2, "guesung/fix/b", "B 버그 수정");
	nextVersion = mergePr(3, "guesung/chore/next-version-1.2.0", "다음 버전");
	merge3 = mergePr(4, "guesung/feat/c", "C 기능 추가");
});

afterAll(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe("parseMergeLog", () => {
	it("PR 번호·본문 첫 줄 제목·소스 브랜치를 읽고 순서를 지킨다", () => {
		const log = [
			`${"a".repeat(40)}${US}Merge pull request #9 from guesung/feat/x${US}새 기능${RS}`,
			`\n${"b".repeat(40)}${US}Merge pull request #8 from guesung/fix/y${US}\n\n버그${RS}`,
		].join("");

		expect(parseMergeLog(log)).toEqual([
			{
				sha: "a".repeat(40),
				number: 9,
				title: "새 기능",
				branch: "guesung/feat/x",
			},
			{
				sha: "b".repeat(40),
				number: 8,
				title: "버그",
				branch: "guesung/fix/y",
			},
		]);
	});

	it("본문이 비면 커밋 제목을 제목으로 쓴다", () => {
		const log = `${"a".repeat(40)}${US}Merge pull request #9 from guesung/feat/x${US}${RS}`;

		expect(parseMergeLog(log)[0].title).toBe(
			"Merge pull request #9 from guesung/feat/x",
		);
	});

	it.each([
		"Merge pull request #5 from guesung/chore/next-version-1.2.0",
		"Merge pull request #5 from chore/next-version-1.2.0",
		"Merge branch 'develop' into master",
	])("%s는 버린다", (subject) => {
		expect(
			parseMergeLog(`${"a".repeat(40)}${US}${subject}${US}제목${RS}`),
		).toEqual([]);
	});

	it("빈 로그는 빈 목록이다", () => {
		expect(parseMergeLog("")).toEqual([]);
	});
});

describe("classifyRange", () => {
	it("직전 SHA가 없으면 first", () => {
		expect(
			classifyRange({ previousSha: null, ref: merge3, cwd: repo }).kind,
		).toBe("first");
	});

	it("같으면 same", () => {
		expect(
			classifyRange({ previousSha: merge3, ref: merge3, cwd: repo }).kind,
		).toBe("same");
	});

	it("ref가 직전 SHA의 조상이면 rollback", () => {
		expect(
			classifyRange({ previousSha: merge3, ref: merge1, cwd: repo }).kind,
		).toBe("rollback");
	});

	it("직전 SHA가 ref의 조상이면 forward", () => {
		expect(
			classifyRange({ previousSha: merge1, ref: merge3, cwd: repo }).kind,
		).toBe("forward");
	});

	it("갈라진 ref는 diverged", () => {
		git("checkout", "-q", "-b", "side", base);
		const side = commitFile("side.txt", "side");
		git("checkout", "-q", "master");

		expect(
			classifyRange({ previousSha: merge3, ref: side, cwd: repo }).kind,
		).toBe("diverged");
	});

	it("직전 SHA가 이 클론에 없으면 diverged", () => {
		expect(
			classifyRange({ previousSha: "f".repeat(40), ref: merge3, cwd: repo })
				.kind,
		).toBe("diverged");
	});

	it("ref가 브랜치 이름이어도 전체 SHA로 풀어서 비교한다", () => {
		const range = classifyRange({
			previousSha: merge3,
			ref: "master",
			cwd: repo,
		});

		expect(range.kind).toBe("same");
		expect(range.refSha).toBe(merge3);
	});

	it("해석할 수 없는 ref는 던진다", () => {
		expect(() =>
			classifyRange({ previousSha: null, ref: "no-such-ref", cwd: repo }),
		).toThrow("no-such-ref");
	});
});

describe("collectDeployPrs", () => {
	it("forward에서 타깃에 영향 준 PR만 최신 순으로 남기고 다음 버전 PR은 뺀다", () => {
		const result = collectDeployPrs({
			previousSha: base,
			ref: merge3,
			target: "web",
			cwd: repo,
			detectAffected: affectedBy({
				[merge1]: { web: true },
				[merge2]: { extension: true },
				[nextVersion]: { web: true },
				[merge3]: { web: true, extension: true },
			}),
		});

		expect(result.kind).toBe("forward");
		expect(result.prs.map((pr) => pr.number)).toEqual([4, 1]);
		expect(result.prs[0]).toMatchObject({
			title: "C 기능 추가",
			branch: "guesung/feat/c",
		});
	});

	it("타깃마다 따로 귀속한다", () => {
		const detectAffected = affectedBy({
			[merge1]: { web: true },
			[merge2]: { extension: true },
			[merge3]: { app: true },
		});
		const numbersFor = (target: "web" | "extension" | "app") =>
			collectDeployPrs({
				previousSha: base,
				ref: merge3,
				target,
				cwd: repo,
				detectAffected,
			}).prs.map((pr) => pr.number);

		expect(numbersFor("web")).toEqual([1]);
		expect(numbersFor("extension")).toEqual([2]);
		expect(numbersFor("app")).toEqual([4]);
	});

	it("각 PR을 <머지>^1..<머지>로 판정한다", () => {
		const calls: Array<{ baseRef: string; headRef: string }> = [];

		collectDeployPrs({
			previousSha: merge1,
			ref: merge2,
			target: "web",
			cwd: repo,
			detectAffected: (args: { baseRef: string; headRef: string }) => {
				calls.push(args);

				return { app: false, extension: false, web: true };
			},
		});

		expect(calls).toEqual([
			{
				baseRef: git("rev-parse", `${merge2}^1`),
				headRef: merge2,
				cwd: repo,
			},
		]);
	});

	it("범위 안에 영향 준 PR이 없으면 forward에 빈 목록", () => {
		const result = collectDeployPrs({
			previousSha: base,
			ref: merge3,
			target: "app",
			cwd: repo,
			detectAffected: affectedBy({}),
		});

		expect(result).toMatchObject({ kind: "forward", prs: [] });
	});

	it("판정이 실패한 PR은 빼지 않고 경고를 남긴다", () => {
		const result = collectDeployPrs({
			previousSha: merge1,
			ref: merge2,
			target: "web",
			cwd: repo,
			detectAffected: () => {
				throw new Error("turbo 실패");
			},
		});

		expect(result.prs.map((pr) => pr.number)).toEqual([2]);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain("#2");
	});

	it.each([
		["first", () => null, () => merge3],
		["same", () => merge3, () => merge3],
		["rollback", () => merge3, () => merge1],
		["diverged", () => "f".repeat(40), () => merge3],
	])("%s는 판정을 호출하지 않고 PR 목록이 비어 있다", (kind, previous, ref) => {
		let called = false;
		const result = collectDeployPrs({
			previousSha: previous(),
			ref: ref(),
			target: "web",
			cwd: repo,
			detectAffected: () => {
				called = true;

				return { app: true, extension: true, web: true };
			},
		});

		expect(result.kind).toBe(kind);
		expect(result.prs).toEqual([]);
		expect(called).toBe(false);
	});
});
