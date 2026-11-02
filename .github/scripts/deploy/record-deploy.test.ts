import { execFileSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	buildBodyLines,
	buildEntry,
	formatKst,
	insertEntry,
	parseLatestRefSha,
	recordDeploy,
} from "./record-deploy.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

describe("formatKst", () => {
	it("UTC를 KST(+9)로 바꾼다", () => {
		expect(formatKst(new Date("2026-11-01T05:07:00Z"))).toBe(
			"2026-11-01 14:07",
		);
	});

	it("날짜 경계를 넘긴다", () => {
		expect(formatKst(new Date("2026-12-31T15:30:00Z"))).toBe(
			"2027-01-01 00:30",
		);
	});
});

describe("buildBodyLines", () => {
	const prs = [
		{ number: 12, title: "B 수정" },
		{ number: 9, title: "A  추가\n" },
	];

	it("forward는 PR 줄 목록(공백 정리)", () => {
		expect(buildBodyLines({ kind: "forward", prs, refSha: SHA_A })).toEqual([
			"- #12 B 수정",
			"- #9 A 추가",
		]);
	});

	it.each([
		["forward", [], "변경된 PR 없음"],
		["same", [], "변경된 PR 없음"],
		["first", [], "기록 시작"],
		["rollback", [], `롤백 → ${"a".repeat(7)}`],
		["diverged", [], "master 외 ref 배포"],
	])("%s는 한 줄 문구", (kind, list, expected) => {
		expect(buildBodyLines({ kind, prs: list, refSha: SHA_A })).toEqual([
			expected,
		]);
	});
});

describe("buildEntry / insertEntry / parseLatestRefSha", () => {
	const entry = buildEntry({
		version: "1.11.5",
		deployedAt: new Date("2026-11-01T05:07:00Z"),
		refSha: SHA_A,
		kind: "forward",
		prs: [{ number: 3, title: "제목" }],
	});

	it("항목 형식", () => {
		expect(entry).toBe(
			`## 1.11.5 · 2026-11-01 14:07 KST · aaaaaaa\n<!-- ref: ${SHA_A} -->\n\n- #3 제목\n`,
		);
	});

	it("빈 파일에는 제목과 함께 넣는다", () => {
		expect(insertEntry({ content: "", entry, target: "extension" })).toBe(
			`# 확장 배포 기록\n\n${entry}`,
		);
	});

	it("제목 줄 아래, 기존 항목 위에 끼운다", () => {
		const older = buildEntry({
			version: "web",
			deployedAt: new Date("2026-10-01T00:00:00Z"),
			refSha: SHA_B,
			kind: "first",
			prs: [],
		});
		const content = insertEntry({ content: "", entry: older, target: "web" });
		const next = insertEntry({ content, entry, target: "web" });

		expect(next).toBe(`# 웹 배포 기록\n\n${entry}\n${older}`);
		expect(next.indexOf(entry)).toBeLessThan(next.indexOf(older));
	});

	it("직전 SHA는 첫 항목에서 읽는다", () => {
		const older = buildEntry({
			version: "web",
			deployedAt: new Date("2026-10-01T00:00:00Z"),
			refSha: SHA_B,
			kind: "first",
			prs: [],
		});
		const content = insertEntry({
			content: insertEntry({ content: "", entry: older, target: "web" }),
			entry,
			target: "web",
		});

		expect(parseLatestRefSha(content)).toBe(SHA_A);
	});

	it("항목이 없으면 null", () => {
		expect(parseLatestRefSha("")).toBeNull();
		expect(parseLatestRefSha("# 웹 배포 기록\n")).toBeNull();
	});
});

describe("recordDeploy (로컬 bare remote)", () => {
	let root = "";
	let remote = "";
	let checkout = "";
	let sha1 = "";
	let sha2 = "";

	const git = (cwd: string, ...args: string[]) =>
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
			{ cwd, encoding: "utf8" },
		).trim();

	const commitVersion = (version: string) => {
		mkdirSync(join(checkout, "apps/chrome-extension"), { recursive: true });
		mkdirSync(join(checkout, "apps/app"), { recursive: true });
		writeFileSync(
			join(checkout, "apps/chrome-extension/package.json"),
			JSON.stringify({ version }),
		);
		writeFileSync(
			join(checkout, "apps/app/app.json"),
			JSON.stringify({ expo: { version: `app-${version}` } }),
		);
		git(checkout, "add", ".");
		git(checkout, "commit", "-qm", `v${version}`);

		return git(checkout, "rev-parse", "HEAD");
	};

	const readRemoteFile = (name: string) =>
		git(remote, "show", `deploy-log:${name}`);

	const fixedCollect =
		(overrides: Record<string, unknown> = {}) =>
		({ previousSha }: { previousSha: string | null }) => ({
			kind: previousSha ? "forward" : "first",
			refSha: sha2,
			previousSha,
			prs: [],
			warnings: [],
			...overrides,
		});

	const baseParams = () => ({
		target: "extension",
		ref: "HEAD",
		repository: "guesung/Web-Memo",
		cwd: checkout,
		remoteUrl: remote,
		now: new Date("2026-11-01T05:07:00Z"),
	});

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "record-deploy-"));
		remote = join(root, "remote.git");
		checkout = join(root, "checkout");
		execFileSync("git", ["init", "-q", "--bare", remote]);
		execFileSync("git", ["init", "-q", "-b", "master", checkout]);
		sha1 = commitVersion("1.0.0");
		sha2 = commitVersion("1.1.0");
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("브랜치가 없으면 orphan으로 만들고 target 파일만 쓴다", () => {
		const result = recordDeploy({
			...baseParams(),
			collect: fixedCollect(),
		});

		expect(result).toMatchObject({
			ok: true,
			kind: "first",
			version: "1.1.0",
			recordUrl:
				"https://github.com/guesung/Web-Memo/blob/deploy-log/extension.md",
		});
		expect(git(remote, "ls-tree", "--name-only", "deploy-log")).toBe(
			"extension.md",
		);
		expect(git(remote, "rev-list", "--max-parents=0", "deploy-log")).toBe(
			git(remote, "rev-parse", "deploy-log"),
		);
		expect(readRemoteFile("extension.md")).toBe(
			`# 확장 배포 기록\n\n## 1.1.0 · 2026-11-01 14:07 KST · ${sha2.slice(0, 7)}\n<!-- ref: ${sha2} -->\n\n기록 시작`,
		);
	});

	it("두 번째 기록은 직전 SHA를 넘기고 맨 위에 쌓인다. 다른 타깃 파일은 그대로", () => {
		const previousShas: Array<string | null> = [];
		const collect = ({ previousSha }: { previousSha: string | null }) => {
			previousShas.push(previousSha);

			return {
				kind: previousSha ? "forward" : "first",
				refSha: previousSha ? sha2 : sha1,
				prs: previousSha
					? [{ number: 7, title: "기능", branch: "x", sha: "s" }]
					: [],
				warnings: [],
			};
		};

		recordDeploy({ ...baseParams(), collect });
		recordDeploy({ ...baseParams(), target: "web", collect });
		const second = recordDeploy({ ...baseParams(), collect });

		expect(previousShas).toEqual([null, null, sha1]);
		expect(second.prs).toEqual([
			{
				number: 7,
				title: "기능",
				url: "https://github.com/guesung/Web-Memo/pull/7",
			},
		]);

		const file = readRemoteFile("extension.md");
		expect(file.indexOf("- #7 기능")).toBeGreaterThan(-1);
		expect(file.indexOf(sha2.slice(0, 7))).toBeLessThan(
			file.indexOf(sha1.slice(0, 7)),
		);
		expect(
			git(remote, "ls-tree", "--name-only", "deploy-log").split("\n"),
		).toEqual(["extension.md", "web.md"]);
		expect(readRemoteFile("web.md")).toContain("기록 시작");
	});

	it("web은 버전 자리에 web을 쓰고 app은 app.json 버전을 쓴다", () => {
		recordDeploy({ ...baseParams(), target: "web", collect: fixedCollect() });
		recordDeploy({ ...baseParams(), target: "app", collect: fixedCollect() });

		expect(readRemoteFile("web.md")).toContain("## web · ");
		expect(readRemoteFile("app.md")).toContain("## app-1.1.0 · ");
	});

	it("push가 non-fast-forward로 거절되면 원격을 다시 받아 재시도한다", () => {
		let collectCalls = 0;

		// 첫 회차 push 직전에 원격이 앞서가도록, 먼저 한 번 기록해 브랜치를 만든다.
		recordDeploy({ ...baseParams(), target: "web", collect: fixedCollect() });
		const racing = (args: { previousSha: string | null }) => {
			collectCalls += 1;

			if (collectCalls === 1) {
				const other = join(root, "other");
				execFileSync("git", ["clone", "-q", "-b", "deploy-log", remote, other]);
				writeFileSync(join(other, "app.md"), "# 앱 배포 기록\n");
				git(other, "add", "app.md");
				git(other, "commit", "-qm", "경쟁 기록");
				git(other, "push", "-q", "origin", "deploy-log");
			}

			return fixedCollect()(args);
		};
		const result = recordDeploy({ ...baseParams(), collect: racing });

		expect(result.ok).toBe(true);
		expect(collectCalls).toBe(1);
		expect(
			git(remote, "ls-tree", "--name-only", "deploy-log").split("\n"),
		).toEqual(["app.md", "extension.md", "web.md"]);
	});

	it("3회 모두 실패하면 던지지 않고 실패 결과를 돌려준다", () => {
		recordDeploy({ ...baseParams(), target: "web", collect: fixedCollect() });
		const hook = join(remote, "hooks/pre-receive");
		writeFileSync(hook, "#!/bin/sh\necho 거절 >&2\nexit 1\n");
		chmodSync(hook, 0o755);
		const before = git(remote, "rev-parse", "deploy-log");

		const result = recordDeploy({ ...baseParams(), collect: fixedCollect() });

		expect(result.ok).toBe(false);
		expect(result.error).toContain("거절");
		expect(result.recordUrl).toBe(
			"https://github.com/guesung/Web-Memo/blob/deploy-log/extension.md",
		);
		expect(git(remote, "rev-parse", "deploy-log")).toBe(before);
	});

	it("remote에 닿지 못해도 던지지 않는다", () => {
		const result = recordDeploy({
			...baseParams(),
			remoteUrl: join(root, "없는-remote.git"),
			collect: fixedCollect(),
		});

		expect(result.ok).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it("알 수 없는 타깃은 실패 결과", () => {
		const result = recordDeploy({
			...baseParams(),
			target: "ios",
			collect: fixedCollect(),
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain("ios");
	});

	it("collect가 던져도(ref 해석 불가 등) 실패 결과로 돌려준다", () => {
		const result = recordDeploy({
			...baseParams(),
			collect: () => {
				throw new Error("배포 ref(x)를 해석할 수 없습니다");
			},
		});

		expect(result.ok).toBe(false);
		expect(result.error).toContain("해석할 수 없습니다");
	});
});
