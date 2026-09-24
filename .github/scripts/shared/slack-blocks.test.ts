import { describe, expect, it } from "vitest";
import { buildActionBlock } from "./slack-blocks.mjs";

const REF = "b931ac6a1234567890abcdef1234567890abcdef";

/** action_id 순서만 뽑아 버튼 구성을 한눈에 비교합니다. */
const actionIds = (block: { elements: Array<{ action_id: string }> }) =>
	block.elements.map((element) => element.action_id);

describe("buildActionBlock", () => {
	it("customTarget이 있으면 다른 버전 버튼 값에 대상이 실린다", () => {
		const block = buildActionBlock({
			targets: ["web"],
			ref: REF,
			customTarget: "web",
		});
		const custom = block.elements.find(
			(element: { action_id: string }) => element.action_id === "deploy_custom",
		);

		expect(JSON.parse(custom.value)).toEqual({ ref: REF, target: "web" });
	});

	// 요약 댓글은 여러 대상을 다루므로 모달이 대상 체크박스를 보여줘야 한다
	it("customTarget이 없으면 다른 버전 버튼 값에 대상이 없다", () => {
		const block = buildActionBlock({ targets: ["web", "app"], ref: REF });
		const custom = block.elements.find(
			(element: { action_id: string }) => element.action_id === "deploy_custom",
		);

		expect(JSON.parse(custom.value)).toEqual({ ref: REF });
	});

	it("downloadUrl이 있으면 배포·다른 버전 뒤에 다운로드 링크 버튼이 붙는다", () => {
		const block = buildActionBlock({
			targets: ["extension"],
			ref: REF,
			downloadUrl: "https://github.com/o/r/actions/runs/1/artifacts/2",
			linkUrl: "https://github.com/o/r/actions/runs/1",
			linkLabel: "워크플로 보기",
		});

		expect(actionIds(block)).toEqual([
			"deploy_extension",
			"deploy_custom",
			"download_extension",
			"open_link",
		]);
		expect(block.elements[2]).toMatchObject({
			type: "button",
			url: "https://github.com/o/r/actions/runs/1/artifacts/2",
		});
	});

	it("downloadUrl이 없으면 다운로드 버튼이 없다", () => {
		const block = buildActionBlock({ targets: ["extension"], ref: REF });

		expect(actionIds(block)).not.toContain("download_extension");
	});
});
