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
			"deploy_bump_extension",
			"deploy_custom",
			"download_extension",
			"open_link",
		]);
		expect(block.elements[3]).toMatchObject({
			type: "button",
			url: "https://github.com/o/r/actions/runs/1/artifacts/2",
		});
	});

	it("downloadUrl이 없으면 다운로드 버튼이 없다", () => {
		const block = buildActionBlock({ targets: ["extension"], ref: REF });

		expect(actionIds(block)).not.toContain("download_extension");
	});

	describe("버전 올려 배포 메뉴", () => {
		const versions = { extension: "1.11.5", app: "2.4.9" };
		const findElement = (
			block: { elements: Array<{ action_id: string }> },
			actionId: string,
			// biome-ignore lint/suspicious/noExplicitAny: 테스트에서 블록 구조만 훑는다
		): any => block.elements.find((element) => element.action_id === actionId);

		it("확장·앱 트랙에만 붙고 웹에는 붙지 않는다", () => {
			const block = buildActionBlock({
				targets: ["app", "web", "extension"],
				ref: REF,
				versions,
			});

			expect(actionIds(block)).toEqual([
				"deploy_app",
				"deploy_web",
				"deploy_extension",
				"deploy_bump_extension",
				"deploy_bump_app",
				"deploy_custom",
			]);
			expect(
				actionIds(buildActionBlock({ targets: ["web"], ref: REF, versions })),
			).toEqual(["deploy_web", "deploy_custom"]);
		});

		it("옵션 문구에 결과 버전을 보이고 value에 {target, ref, bump, version}을 싣는다", () => {
			const block = buildActionBlock({
				targets: ["extension"],
				ref: REF,
				versions,
			});
			const select = findElement(block, "deploy_bump_extension");

			expect(select.type).toBe("static_select");
			expect(
				select.options.map(
					(option: { text: { text: string } }) => option.text.text,
				),
			).toEqual(["patch → 1.11.6", "minor → 1.12.0", "major → 2.0.0"]);
			expect(
				select.options.map((option: { value: string }) =>
					JSON.parse(option.value),
				),
			).toEqual([
				{ target: "extension", ref: REF, bump: "patch", version: "1.11.6" },
				{ target: "extension", ref: REF, bump: "minor", version: "1.12.0" },
				{ target: "extension", ref: REF, bump: "major", version: "2.0.0" },
			]);
		});

		it("앱 트랙은 앱 버전 기준으로 계산한다", () => {
			const select = findElement(
				buildActionBlock({ targets: ["app"], ref: REF, versions }),
				"deploy_bump_app",
			);

			expect(select.options[0].text.text).toBe("patch → 2.4.10");
		});

		it("confirm 객체가 있고 되돌릴 수 없음을 알린다", () => {
			const select = findElement(
				buildActionBlock({ targets: ["extension"], ref: REF, versions }),
				"deploy_bump_extension",
			);

			expect(select.confirm.text.text).toContain("되돌릴 수 없습니다");
			expect(select.confirm.confirm.text).toBeTruthy();
			expect(select.confirm.deny.text).toBeTruthy();
		});

		it("option value가 Slack 한도(150자)와 문구 한도(75자)를 넘지 않는다", () => {
			const select = findElement(
				buildActionBlock({
					targets: ["extension"],
					ref: REF,
					versions: { extension: "99.99.99", app: "99.99.99" },
				}),
				"deploy_bump_extension",
			);

			for (const option of select.options) {
				expect(option.value.length).toBeLessThanOrEqual(150);
				expect(option.text.text.length).toBeLessThanOrEqual(75);
			}
		});

		it("기존 배포 버튼과 다른 버전 버튼은 그대로다", () => {
			const block = buildActionBlock({
				targets: ["extension"],
				ref: REF,
				versions,
			});

			expect(findElement(block, "deploy_extension").type).toBe("button");
			expect(findElement(block, "deploy_custom").type).toBe("button");
		});
	});
});
