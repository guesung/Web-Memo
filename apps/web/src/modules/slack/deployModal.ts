import { DEPLOY_TARGET_LABELS, type TDeployTarget } from "./github";

/** view_submission을 이 모달에서 온 것으로 식별하는 값. 라우트가 그대로 비교합니다. */
export const DEPLOY_MODAL_CALLBACK_ID = "deploy_modal";

/** 모달 안 블록·액션 식별자. 제출 payload를 읽을 때 그대로 쓰입니다. */
export const DEPLOY_MODAL_FIELDS = {
	targets: { blockId: "targets_block", actionId: "targets_action" },
	ref: { blockId: "ref_block", actionId: "ref_action" },
	appVersion: { blockId: "app_version_block", actionId: "app_version_action" },
	extensionVersion: {
		blockId: "extension_version_block",
		actionId: "extension_version_action",
	},
} as const;

const TARGET_ORDER: TDeployTarget[] = ["app", "web", "extension"];

/**
 * "다른 버전…" 모달의 view를 만듭니다.
 *
 * @description 되돌리기 어려운 스토어 제출이므로 대상과 ref를 모두 명시적으로 고르게 합니다.
 * 버튼으로 바로 배포하는 경로와 달리 여기에는 confirm을 두지 않습니다 — 모달 제출 자체가
 * 이미 한 번의 확인이기 때문입니다.
 *
 * 버전 칸은 비워 둘 수 있습니다. 적으면 워크플로가 그 값을 기본 브랜치에 커밋하고 그
 * 커밋으로 빌드하므로, 이때 ref 선택은 의미가 없어집니다. 앱과 확장은 스토어 제약이
 * 달라 버전을 공유하지 않으므로(docs/versioning.md) 칸도 따로 둡니다.
 *
 * @param responseUrl 제출 결과를 되돌려 보낼 원본 메시지의 response_url.
 *   모달에는 response_url이 없어 private_metadata로 실어 나릅니다.
 */
export const buildDeployModal = ({
	refOptions,
	defaultRef,
	responseUrl,
	isLoading = false,
}: {
	refOptions: Array<{ label: string; value: string }>;
	defaultRef: string;
	responseUrl: string;
	/** 태그·커밋 목록을 아직 못 받은 상태. 목록이 채워지면 views.update로 교체됩니다. */
	isLoading?: boolean;
}): Record<string, unknown> => {
	const options = refOptions.map(({ label, value }) => ({
		text: { type: "plain_text", text: label },
		value,
	}));
	const initialOption =
		options.find((option) => option.value === defaultRef) ?? options[0];

	return {
		type: "modal",
		callback_id: DEPLOY_MODAL_CALLBACK_ID,
		private_metadata: JSON.stringify({ responseUrl }),
		title: { type: "plain_text", text: "배포" },
		submit: { type: "plain_text", text: "배포" },
		close: { type: "plain_text", text: "취소" },
		blocks: [
			{
				type: "input",
				block_id: DEPLOY_MODAL_FIELDS.targets.blockId,
				label: { type: "plain_text", text: "배포 대상" },
				element: {
					type: "checkboxes",
					action_id: DEPLOY_MODAL_FIELDS.targets.actionId,
					options: TARGET_ORDER.map((target) => ({
						text: { type: "plain_text", text: DEPLOY_TARGET_LABELS[target] },
						value: target,
					})),
				},
			},
			{
				type: "input",
				block_id: DEPLOY_MODAL_FIELDS.ref.blockId,
				label: {
					type: "plain_text",
					text: "배포할 커밋 / 태그 (아래에 버전을 적으면 무시됩니다)",
				},
				element: {
					type: "static_select",
					action_id: DEPLOY_MODAL_FIELDS.ref.actionId,
					options,
					...(initialOption ? { initial_option: initialOption } : {}),
				},
			},
			{
				type: "input",
				block_id: DEPLOY_MODAL_FIELDS.appVersion.blockId,
				optional: true,
				label: { type: "plain_text", text: "올릴 앱 버전" },
				hint: {
					type: "plain_text",
					text: "비우면 레포에 적힌 버전 그대로 빌드합니다.",
				},
				element: {
					type: "plain_text_input",
					action_id: DEPLOY_MODAL_FIELDS.appVersion.actionId,
					placeholder: { type: "plain_text", text: "예: 1.0.9" },
				},
			},
			{
				type: "input",
				block_id: DEPLOY_MODAL_FIELDS.extensionVersion.blockId,
				optional: true,
				label: { type: "plain_text", text: "올릴 확장 버전" },
				hint: {
					type: "plain_text",
					text: "비우면 레포에 적힌 버전 그대로 빌드합니다.",
				},
				element: {
					type: "plain_text_input",
					action_id: DEPLOY_MODAL_FIELDS.extensionVersion.actionId,
					placeholder: { type: "plain_text", text: "예: 1.10.15" },
				},
			},
			...(isLoading
				? [
						{
							type: "context",
							elements: [
								{ type: "mrkdwn", text: "_태그·커밋 목록을 불러오는 중…_" },
							],
						},
					]
				: []),
		],
	};
};
