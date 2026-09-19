import { describe, expect, it } from "vitest";
import { buildRootPayload } from "./thread-messages.mjs";

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
