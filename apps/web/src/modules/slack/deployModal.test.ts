import { describe, expect, it } from "vitest";

import { buildDeployModal, DEPLOY_MODAL_FIELDS } from "./deployModal";

const baseParams = {
	refOptions: [{ label: "b931ac6 fix: 예시", value: "b931ac6" }],
	defaultRef: "b931ac6",
	responseUrl: "https://hooks.slack.test/response",
};

type TBlock = { block_id?: string };

/** 모달에 들어 있는 입력 블록의 block_id 목록. */
const blockIdsOf = (view: Record<string, unknown>): string[] =>
	(view.blocks as TBlock[]).flatMap((block) =>
		block.block_id ? [block.block_id] : [],
	);

describe("buildDeployModal", () => {
	describe("대상을 고정하지 않으면 (요약 댓글의 다른 버전…)", () => {
		const view = buildDeployModal(baseParams);

		it("대상 체크박스와 앱·확장 버전 칸이 모두 있다", () => {
			expect(blockIdsOf(view)).toEqual([
				DEPLOY_MODAL_FIELDS.targets.blockId,
				DEPLOY_MODAL_FIELDS.ref.blockId,
				DEPLOY_MODAL_FIELDS.appVersion.blockId,
				DEPLOY_MODAL_FIELDS.extensionVersion.blockId,
			]);
		});

		it("제목은 배포이고 metadata에 대상이 없다", () => {
			expect(view.title).toEqual({ type: "plain_text", text: "배포" });
			expect(
				JSON.parse(view.private_metadata as string).target,
			).toBeUndefined();
		});
	});

	describe("대상을 고정하면 (타깃별 댓글의 다른 버전…)", () => {
		it("웹은 대상 체크박스도 버전 칸도 없고 커밋 선택만 남는다", () => {
			const view = buildDeployModal({ ...baseParams, target: "web" });

			expect(blockIdsOf(view)).toEqual([DEPLOY_MODAL_FIELDS.ref.blockId]);
		});

		it("앱은 앱 버전 칸만 남는다", () => {
			const view = buildDeployModal({ ...baseParams, target: "app" });

			expect(blockIdsOf(view)).toEqual([
				DEPLOY_MODAL_FIELDS.ref.blockId,
				DEPLOY_MODAL_FIELDS.appVersion.blockId,
			]);
		});

		it("확장은 확장 버전 칸만 남는다", () => {
			const view = buildDeployModal({ ...baseParams, target: "extension" });

			expect(blockIdsOf(view)).toEqual([
				DEPLOY_MODAL_FIELDS.ref.blockId,
				DEPLOY_MODAL_FIELDS.extensionVersion.blockId,
			]);
		});

		it("제목에 대상이 드러나고 24자를 넘지 않는다", () => {
			const view = buildDeployModal({ ...baseParams, target: "app" });
			const title = (view.title as { text: string }).text;

			expect(title).toBe("📱 앱 배포");
			expect(title.length).toBeLessThanOrEqual(24);
		});

		// 제출 때 체크박스가 없으므로 대상은 metadata로만 이어진다
		it("고정한 대상이 private_metadata로 제출까지 이어진다", () => {
			const view = buildDeployModal({ ...baseParams, target: "extension" });

			expect(JSON.parse(view.private_metadata as string)).toEqual({
				responseUrl: baseParams.responseUrl,
				target: "extension",
			});
		});
	});
});
