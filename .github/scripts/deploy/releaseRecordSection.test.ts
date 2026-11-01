import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	buildRecordBlock,
	buildRecordSectionText,
	readRecordResult,
} from "./release-record-section.mjs";

const RECORD_URL = "https://github.com/guesung/Web-Memo/blob/deploy-log/web.md";
const LINK = `<${RECORD_URL}|배포 기록 보기>`;

const pr = (number: number, title = `제목 ${number}`) => ({
	number,
	title,
	url: `https://github.com/guesung/Web-Memo/pull/${number}`,
});

const record = (overrides: Record<string, unknown> = {}) => ({
	ok: true,
	target: "web",
	kind: "forward",
	refSha: `${"abcdef1234567890".repeat(2)}abcdef12`,
	prs: [],
	recordUrl: RECORD_URL,
	...overrides,
});

describe("buildRecordSectionText", () => {
	it("forward이고 PR이 있으면 건수와 PR 줄을 보여준다", () => {
		expect(
			buildRecordSectionText(record({ prs: [pr(12), pr(9, "A & <B>")] })),
		).toBe(
			[
				"*이번 배포에 들어간 PR 2건*",
				"<https://github.com/guesung/Web-Memo/pull/12|#12> 제목 12",
				"<https://github.com/guesung/Web-Memo/pull/9|#9> A &amp; &lt;B&gt;",
				LINK,
			].join("\n"),
		);
	});

	it("10건까지만 줄로 보여주고 나머지는 외 n건", () => {
		const prs = Array.from({ length: 13 }, (_, index) => pr(100 - index));
		const lines = buildRecordSectionText(record({ prs })).split("\n");

		expect(lines[0]).toBe("*이번 배포에 들어간 PR 13건*");
		expect(lines.filter((line) => line.startsWith("<https://"))).toHaveLength(
			10 + 1,
		);
		expect(lines).toContain("외 3건");
		expect(lines.at(-1)).toBe(LINK);
	});

	it("정확히 10건이면 외 n건이 없다", () => {
		const prs = Array.from({ length: 10 }, (_, index) => pr(index + 1));

		expect(buildRecordSectionText(record({ prs }))).not.toContain("외 ");
	});

	it.each([
		[{ kind: "forward", prs: [] }, "변경된 PR 없음"],
		[{ kind: "same" }, "변경된 PR 없음"],
		[{ kind: "first" }, "기록 시작"],
		[{ kind: "rollback" }, "롤백 → abcdef1"],
		[{ kind: "diverged" }, "master 외 ref 배포"],
	])("%j는 PR 섹션 대신 한 줄", (overrides, expected) => {
		expect(buildRecordSectionText(record(overrides))).toBe(
			`${expected}\n${LINK}`,
		);
	});

	it("first/rollback에서는 PR이 있어도 PR 섹션을 만들지 않는다", () => {
		expect(
			buildRecordSectionText(record({ kind: "first", prs: [pr(1)] })),
		).toBe(`기록 시작\n${LINK}`);
	});

	it("기록 실패여도 링크는 붙고 기록 실패 한 줄이 더해진다", () => {
		expect(
			buildRecordSectionText(record({ ok: false, error: "push 거절" })),
		).toBe(`기록 실패\n${LINK}`);
	});
});

describe("buildRecordBlock", () => {
	it("결과가 없으면 null", () => {
		expect(buildRecordBlock(null)).toBeNull();
	});

	it("mrkdwn section 블록", () => {
		expect(buildRecordBlock(record())?.type).toBe("section");
	});
});

describe("readRecordResult", () => {
	let directory = "";

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "record-section-"));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	it("경로가 없거나 파일이 없으면 null", () => {
		expect(readRecordResult({ path: undefined, target: "web" })).toBeNull();
		expect(
			readRecordResult({ path: join(directory, "없음.json"), target: "web" }),
		).toBeNull();
	});

	it("깨진 JSON은 던지지 않고 null", () => {
		const path = join(directory, "r.json");
		writeFileSync(path, "{깨짐");

		expect(readRecordResult({ path, target: "web" })).toBeNull();
	});

	it("다른 타깃의 결과는 무시한다", () => {
		const path = join(directory, "r.json");
		writeFileSync(path, JSON.stringify(record({ target: "app" })));

		expect(readRecordResult({ path, target: "web" })).toBeNull();
	});

	it("같은 타깃의 결과를 읽는다", () => {
		const path = join(directory, "r.json");
		writeFileSync(path, JSON.stringify(record()));

		expect(readRecordResult({ path, target: "web" })?.kind).toBe("forward");
	});
});

describe("notify-release-result.mjs 배포 기록 섹션", () => {
	const SCRIPT_PATH = fileURLToPath(
		new URL("./notify-release-result.mjs", import.meta.url),
	);
	let directory = "";

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "record-notify-"));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	const run = (env: Record<string, string>) => {
		const result = spawnSync("node", [SCRIPT_PATH], {
			encoding: "utf8",
			env: {
				PATH: process.env.PATH ?? "",
				GITHUB_REPOSITORY: "guesung/Web-Memo",
				GITHUB_RUN_ID: "123",
				TARGET: "web",
				...env,
			},
		});

		return JSON.parse(result.stdout) as {
			blocks: Array<{ type: string; text?: { text: string } }>;
		};
	};

	const texts = (payload: ReturnType<typeof run>) =>
		payload.blocks.map((block) => block.text?.text ?? "").join("\n");

	it("성공 결과에 기록 섹션이 한 메시지 안에 합쳐진다", () => {
		const path = join(directory, "r.json");
		writeFileSync(path, JSON.stringify(record({ prs: [pr(12)] })));

		const payload = run({ RESULT: "success", DEPLOY_RECORD_PATH: path });

		expect(texts(payload)).toContain("*이번 배포에 들어간 PR 1건*");
		expect(texts(payload)).toContain(LINK);
	});

	it("결과 JSON이 없으면 기존 메시지 그대로(블록 수가 같다)", () => {
		const without = run({ RESULT: "success" });
		const missing = run({
			RESULT: "success",
			DEPLOY_RECORD_PATH: join(directory, "없음.json"),
		});

		expect(missing.blocks).toEqual(without.blocks);
		expect(texts(without)).not.toContain("배포 기록 보기");
	});

	it.each(["failure", "cancelled"])(
		"%s 결과에는 기록 섹션을 붙이지 않는다",
		(result) => {
			const path = join(directory, "r.json");
			writeFileSync(path, JSON.stringify(record()));

			expect(
				texts(run({ RESULT: result, DEPLOY_RECORD_PATH: path })),
			).not.toContain("배포 기록 보기");
		},
	);

	it("기록이 실패했어도 링크와 기록 실패 줄이 붙는다", () => {
		const path = join(directory, "r.json");
		writeFileSync(path, JSON.stringify(record({ ok: false, error: "x" })));

		const text = texts(run({ RESULT: "success", DEPLOY_RECORD_PATH: path }));

		expect(text).toContain("기록 실패");
		expect(text).toContain(LINK);
	});
});
