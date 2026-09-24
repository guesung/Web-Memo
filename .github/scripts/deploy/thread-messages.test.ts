import { describe, expect, it } from "vitest";
import {
	buildNoTargetPayload,
	buildRootPayload,
	buildTargetReplyPayload,
	decideTargetReply,
	isNoTargetChange,
} from "./thread-messages.mjs";

const REPOSITORY_URL = "https://github.com/guesung/Web-Memo";
const COMMIT_SHA = "b931ac6a1234567890abcdef1234567890abcdef";

const prMergeParams = {
	targetBranch: "master",
	subject: "GA 사용자 집계를 고친다",
	mergeSource: { prNumber: 512, branch: "guesung/fix/ga-extension-client-id" },
	actor: "guesung",
	commitSha: COMMIT_SHA,
	repositoryUrl: REPOSITORY_URL,
};

const contextText = (payload: ReturnType<typeof buildRootPayload>) =>
	(payload.blocks[1] as { elements: { text: string }[] }).elements[0].text;

describe("buildRootPayload", () => {
	it("헤드라인, 제목, 컨텍스트 순서의 블록을 만든다", () => {
		const payload = buildRootPayload(prMergeParams);

		expect(payload.blocks.map((block: { type: string }) => block.type)).toEqual([
			"section",
			"context",
		]);
		expect(payload.blocks[0]).toEqual({
			type: "section",
			text: {
				type: "mrkdwn",
				text: "*🔀 master 머지*\nGA 사용자 집계를 고친다",
			},
		});
	});

	it("헤드라인에 대상 브랜치가 들어간다", () => {
		expect(
			buildRootPayload({ ...prMergeParams, targetBranch: "develop" }).blocks[0],
		).toMatchObject({
			text: { text: expect.stringContaining("develop") },
		});
	});

	it("컨텍스트에 PR 번호, 브랜치, 작성자, 커밋 링크가 이 순서로 들어간다", () => {
		expect(contextText(buildRootPayload(prMergeParams))).toBe(
			[
				`<${REPOSITORY_URL}/pull/512|#512>`,
				"`guesung/fix/ga-extension-client-id`",
				"guesung",
				`<${REPOSITORY_URL}/commit/${COMMIT_SHA}|\`b931ac6\`>`,
			].join(" · "),
		);
	});

	it("PR 머지 커밋이 아니면 PR 번호와 브랜치를 자리째 뺀다", () => {
		const context = contextText(
			buildRootPayload({
				...prMergeParams,
				targetBranch: "develop",
				subject: "Merge branch 'X' into develop",
				mergeSource: null,
			}),
		);

		expect(context).toBe(
			`guesung · <${REPOSITORY_URL}/commit/${COMMIT_SHA}|\`b931ac6\`>`,
		);
		expect(context).not.toContain("#");
		expect(context).not.toMatch(/(^| )- /);
	});

	it("작성자가 없으면 그 항목만 뺀다", () => {
		expect(
			contextText(
				buildRootPayload({ ...prMergeParams, mergeSource: null, actor: "" }),
			),
		).toBe(`<${REPOSITORY_URL}/commit/${COMMIT_SHA}|\`b931ac6\`>`);
	});

	it("text는 링크 문법 없이 헤드라인과 제목만 담는다", () => {
		expect(buildRootPayload(prMergeParams).text).toBe(
			"🔀 master 머지 — GA 사용자 집계를 고친다",
		);
	});

	it("제목을 못 읽었으면 헤드라인만 나간다", () => {
		const payload = buildRootPayload({ ...prMergeParams, subject: "" });

		expect(payload.text).toBe("🔀 master 머지");
		expect(payload.blocks[0]).toMatchObject({
			text: { text: "*🔀 master 머지*" },
		});
	});
});

describe("decideTargetReply", () => {
	// changed가 true일 때 needs 결과 네 값 전부
	it.each([
		["success", "success"],
		["failure", "failure"],
		["cancelled", null],
		["skipped", null],
	])("changed=true, result=%s이면 %s", (result, expected) => {
		expect(decideTargetReply({ changed: "true", result })).toBe(expected);
	});

	// changed가 false면 결과가 무엇이든 댓글이 없다
	it.each(["success", "failure", "cancelled", "skipped"])(
		"changed=false, result=%s이면 댓글이 없다",
		(result) => {
			expect(decideTargetReply({ changed: "false", result })).toBeNull();
		},
	);

	it("changed가 비어 있거나 알 수 없는 값이면 댓글이 없다", () => {
		expect(decideTargetReply({ changed: "", result: "success" })).toBeNull();
		expect(decideTargetReply({ changed: "true", result: "" })).toBeNull();
		expect(decideTargetReply({ changed: "true", result: "timed_out" })).toBeNull();
	});
});

describe("buildTargetReplyPayload", () => {
	const RUN_URL = `${REPOSITORY_URL}/actions/runs/123`;

	it.each([
		["web", "success", "웹 빌드 성공"],
		["web", "failure", "웹 빌드 실패"],
		["extension", "success", "확장 빌드 성공"],
		["extension", "failure", "확장 빌드 실패"],
		["app", "success", "앱 빌드 성공"],
		["app", "failure", "앱 빌드 실패"],
	] as const)("%s %s 문구는 '%s'이다", (target, outcome, message) => {
		const payload = buildTargetReplyPayload({
			target,
			outcome,
			runUrl: RUN_URL,
		});

		expect(payload.text).toBe(message);
		expect(payload.blocks[0]).toMatchObject({
			text: { text: expect.stringContaining(message) },
		});
	});

	it("이 실행의 Actions 로그 링크가 컨텍스트에 들어간다", () => {
		const payload = buildTargetReplyPayload({
			target: "web",
			outcome: "success",
			runUrl: RUN_URL,
		});

		expect(payload.blocks[1]).toEqual({
			type: "context",
			elements: [{ type: "mrkdwn", text: `<${RUN_URL}|Actions 로그 보기>` }],
		});
	});

	it("actionBlock을 넘기면 로그 링크 줄 자리에 버튼 줄이 들어간다", () => {
		const actionBlock = { type: "actions", elements: [] };
		const payload = buildTargetReplyPayload({
			target: "web",
			outcome: "success",
			runUrl: RUN_URL,
			actionBlock,
		});

		expect(payload.blocks).toHaveLength(2);
		expect(payload.blocks[1]).toBe(actionBlock);
		expect(JSON.stringify(payload.blocks)).not.toContain("Actions 로그 보기");
	});

	it("알 수 없는 타깃이면 던진다", () => {
		expect(() =>
			buildTargetReplyPayload({
				target: "ios" as never,
				outcome: "success",
				runUrl: RUN_URL,
			}),
		).toThrow();
	});
});

describe("isNoTargetChange", () => {
	const allSkipped = {
		ci: "success",
		app: "skipped",
		web: "skipped",
		extension: "skipped",
	};

	it("ci가 통과했고 웹·앱·확장이 전부 skipped면 변경 없음이다", () => {
		expect(isNoTargetChange(allSkipped)).toBe(true);
	});

	it.each(["app", "web", "extension"])(
		"%s 하나라도 success면 변경 없음이 아니다",
		(target) => {
			expect(isNoTargetChange({ ...allSkipped, [target]: "success" })).toBe(
				false,
			);
		},
	);

	it.each(["app", "web", "extension"])(
		"%s가 failure나 cancelled면 변경 없음이 아니다",
		(target) => {
			expect(isNoTargetChange({ ...allSkipped, [target]: "failure" })).toBe(
				false,
			);
			expect(isNoTargetChange({ ...allSkipped, [target]: "cancelled" })).toBe(
				false,
			);
		},
	);

	// ci가 안 통과했는데 "변경 없음, CI 통과"라고 말하면 거짓이 된다
	it.each(["failure", "cancelled", "skipped"])(
		"ci가 %s면 변경 없음이라고 말하지 않는다",
		(ci) => {
			expect(isNoTargetChange({ ...allSkipped, ci })).toBe(false);
		},
	);

	it("결과가 빠져 있으면 변경 없음이라고 말하지 않는다", () => {
		expect(isNoTargetChange({})).toBe(false);
		expect(isNoTargetChange({ ci: "success" })).toBe(false);
		expect(isNoTargetChange({ ci: "success", app: "skipped" })).toBe(false);
	});
});

describe("buildNoTargetPayload", () => {
	const RUN_URL = `${REPOSITORY_URL}/actions/runs/123`;

	it("변경 없음을 알리는 section과 로그 링크 context를 만든다", () => {
		const payload = buildNoTargetPayload({ runUrl: RUN_URL });

		expect(payload.text).toBe("배포 대상 변경 없음");
		expect(payload.blocks.map((block: { type: string }) => block.type)).toEqual([
			"section",
			"context",
		]);
		expect(payload.blocks[0]).toMatchObject({
			text: { text: expect.stringContaining("배포 대상 변경 없음") },
		});
		expect(payload.blocks[1]).toEqual({
			type: "context",
			elements: [{ type: "mrkdwn", text: `<${RUN_URL}|Actions 로그 보기>` }],
		});
	});

	it("배포 버튼(actions 블록)을 달지 않는다", () => {
		const types = buildNoTargetPayload({ runUrl: RUN_URL }).blocks.map(
			(block: { type: string }) => block.type,
		);

		expect(types).not.toContain("actions");
	});
});
