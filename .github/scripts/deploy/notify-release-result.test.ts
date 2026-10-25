import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
	new URL("./notify-release-result.mjs", import.meta.url),
);

/** 웹훅 없이 돌려 stdout에 찍힌 페이로드를 읽습니다. 개발 기기의 시크릿이 새지 않도록 깨끗한 env로 실행합니다. */
const runScript = (env: Record<string, string>) => {
	const result = spawnSync("node", [SCRIPT_PATH], {
		encoding: "utf8",
		env: {
			PATH: process.env.PATH ?? "",
			GITHUB_REPOSITORY: "guesung/Web-Memo",
			GITHUB_RUN_ID: "123",
			...env,
		},
	});

	return { status: result.status, payload: JSON.parse(result.stdout) };
};

const buttonsOf = (payload: {
	blocks: Array<{ type: string; elements?: Array<{ action_id: string }> }>;
}) =>
	payload.blocks
		.find((block) => block.type === "actions")
		?.elements?.map((element) => element.action_id);

describe("notify-release-result.mjs 웹 열기 버튼", () => {
	it("웹 릴리스가 성공하면 상용 주소로 가는 웹 열기 버튼이 붙는다", () => {
		const { status, payload } = runScript({ TARGET: "web", RESULT: "success" });
		const actions = payload.blocks.find(
			(block: { type: string }) => block.type === "actions",
		);

		expect(status).toBe(0);
		expect(buttonsOf(payload)).toEqual(["open_web", "open_run"]);
		expect(actions.elements[0].url).toBe("https://www.webmemo.xyz");
	});

	// 실패한 배포의 주소는 아직 이전 커밋을 서빙한다
	it.each(["failure", "cancelled"])(
		"웹 릴리스가 %s이면 웹 열기 버튼이 없다",
		(result) => {
			const { payload } = runScript({ TARGET: "web", RESULT: result });

			expect(buttonsOf(payload)).toEqual(["open_run"]);
		},
	);

	it.each(["app", "extension"])("%s 릴리스에는 웹 열기 버튼이 없다", (target) => {
		const { payload } = runScript({ TARGET: target, RESULT: "success" });

		expect(buttonsOf(payload)).toEqual(["open_run"]);
	});
});
