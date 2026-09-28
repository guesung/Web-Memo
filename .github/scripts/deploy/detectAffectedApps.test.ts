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

const SCRIPT_PATH = resolve(".github/scripts/deploy/detect-affected-apps.sh");
let fixtureDirectory = "";
let baseRef = "";

const commitFixture = () => {
	execFileSync("git", ["add", "."], { cwd: fixtureDirectory });
	execFileSync(
		"git",
		[
			"-c",
			"user.name=Test",
			"-c",
			"user.email=test@example.com",
			"-c",
			"core.hooksPath=/dev/null",
			"commit",
			"-qm",
			"fixture",
		],
		{ cwd: fixtureDirectory },
	);
};

const runDetector = (
	packages: string[],
	extraEnv: Record<string, string> = {},
) => {
	writeFileSync(
		join(fixtureDirectory, "packages.json"),
		JSON.stringify({
			packages: {
				count: packages.length,
				items: packages.map((name) => ({ name, path: "fixture" })),
			},
		}),
	);

	return spawnSync("bash", [SCRIPT_PATH], {
		cwd: fixtureDirectory,
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${join(fixtureDirectory, "bin")}:${process.env.PATH}`,
			BASE_REF: baseRef,
			GITHUB_OUTPUT: join(fixtureDirectory, "output"),
			...extraEnv,
		},
	});
};

const readOutput = () => readFileSync(join(fixtureDirectory, "output"), "utf8");

describe("앱 영향 판정 스크립트", () => {
	beforeEach(() => {
		fixtureDirectory = mkdtempSync(join(tmpdir(), "app-affected-"));
		execFileSync("git", ["init", "-q"], { cwd: fixtureDirectory });
		mkdirSync(join(fixtureDirectory, ".github/workflows"), { recursive: true });
		mkdirSync(join(fixtureDirectory, "bin"));
		writeFileSync(
			join(fixtureDirectory, "package.json"),
			'{"devDependencies":{"turbo":"^2.1.1"}}',
		);
		writeFileSync(join(fixtureDirectory, "README.md"), "initial");
		writeFileSync(
			join(fixtureDirectory, ".github/workflows/cd-app.yml"),
			"initial",
		);
		writeFileSync(
			join(fixtureDirectory, "bin/npx"),
			'#!/usr/bin/env bash\nset -eu\nprintf "%s\\n" "$*" >> calls\nif [[ "$*" == *"--filter"* || "$*" == *"-F "* ]]; then exit 64; fi\nif [[ "${FAIL_TURBO:-}" == "true" ]]; then exit 42; fi\ncat packages.json\n',
			{ mode: 0o755 },
		);
		commitFixture();
		baseRef = execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: fixtureDirectory,
			encoding: "utf8",
		}).trim();
	});

	afterEach(() => {
		rmSync(fixtureDirectory, { recursive: true, force: true });
	});

	it("워크플로만 바뀌어도 앱을 빌드하고 웹·확장은 건너뛴다", () => {
		writeFileSync(
			join(fixtureDirectory, ".github/workflows/cd-app.yml"),
			"updated",
		);
		commitFixture();

		expect(runDetector([]).status).toBe(0);
		expect(readOutput()).toBe("app=true\nextension=false\nweb=false\n");
	});

	it("문서 변경만 있고 영향 패키지가 없으면 모두 건너뛴다", () => {
		writeFileSync(join(fixtureDirectory, "README.md"), "updated");
		commitFixture();

		expect(runDetector([]).status).toBe(0);
		expect(readOutput()).toBe("app=false\nextension=false\nweb=false\n");
	});

	it.each([
		[["@web-memo/app"], "app=true\nextension=false\nweb=false\n"],
		[["@web-memo/web", "e2e"], "app=false\nextension=false\nweb=true\n"],
		[
			["@web-memo/shared", "@web-memo/app", "@web-memo/web"],
			"app=true\nextension=true\nweb=true\n",
		],
		[["@web-memo/side-panel"], "app=false\nextension=true\nweb=false\n"],
	] as const)("실제 Turbo 응답 구조로 %j를 판정한다", (packages, expected) => {
		expect(runDetector([...packages]).status).toBe(0);
		expect(readOutput()).toBe(expected);
		expect(
			readFileSync(join(fixtureDirectory, "calls"), "utf8").trim().split("\n"),
		).toHaveLength(1);
	});

	it("Turbo 실패를 건너뛰기 결과로 숨기지 않는다", () => {
		expect(runDetector([], { FAIL_TURBO: "true" }).status).toBe(42);
	});

	it("기준 커밋을 찾지 못하면 전체 빌드한다", () => {
		expect(runDetector([], { BASE_REF: "missing-ref" }).status).toBe(0);
		expect(readOutput()).toBe("app=true\nextension=true\nweb=true\n");
	});

	it("의존성이 바뀌면 전체 빌드한다", () => {
		writeFileSync(join(fixtureDirectory, "pnpm-lock.yaml"), "updated");
		commitFixture();

		expect(runDetector([]).status).toBe(0);
		expect(readOutput()).toBe("app=true\nextension=true\nweb=true\n");
	});
});
