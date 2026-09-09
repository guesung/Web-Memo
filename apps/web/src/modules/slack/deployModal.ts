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
 * 버전 입력 블록 하나를 만듭니다.
 *
 * @description 버전업은 master에 커밋을 만드는 되돌리기 어려운 동작이라, 제출 뒤에 안내하지 않고
 * hint로 모달 안에서 미리 알립니다. 비워 두면 버전업을 건너뛴다는 뜻이므로 `optional: true`입니다.
 *
 * @param currentVersion 현재 배포된 버전. placeholder로만 쓰이며, 없으면 placeholder를 아예 넣지
 *   않습니다 — 빈 문자열 placeholder는 Slack이 거부합니다.
 */
function buildVersionInputBlock({
	field,
	label,
	currentVersion,
}: {
	field: { blockId: string; actionId: string };
	label: string;
	currentVersion?: string;
}): Record<string, unknown> {
	return {
		type: "input",
		block_id: field.blockId,
		optional: true,
		label: { type: "plain_text", text: label },
		element: {
			type: "plain_text_input",
			action_id: field.actionId,
			...(currentVersion
				? {
						placeholder: {
							type: "plain_text",
							text: `현재 ${currentVersion}`,
						},
					}
				: {}),
		},
		hint: {
			type: "plain_text",
			text: "입력하면 master에 버전 커밋을 만든 뒤 그 커밋을 배포합니다.",
		},
	};
}

/**
 * "다른 버전…" 모달의 view를 만듭니다.
 *
 * @description 되돌리기 어려운 스토어 제출이므로 대상과 ref를 모두 명시적으로 고르게 합니다.
 * 버튼으로 바로 배포하는 경로와 달리 여기에는 confirm을 두지 않습니다 — 모달 제출 자체가
 * 이미 한 번의 확인이기 때문입니다.
 *
 * @param responseUrl 제출 결과를 되돌려 보낼 원본 메시지의 response_url.
 *   모달에는 response_url이 없어 private_metadata로 실어 나릅니다.
 * @param currentVersions 현재 배포된 앱·확장 버전. placeholder로만 쓰이므로 선택입니다 —
 *   모달을 먼저 띄우고(`isLoading: true`) 나중에 views.update로 채우는 2단 구조라
 *   첫 호출에는 아직 값이 없습니다.
 */
export const buildDeployModal = ({
	refOptions,
	defaultRef,
	responseUrl,
	currentVersions,
	isLoading = false,
}: {
	refOptions: Array<{ label: string; value: string }>;
	defaultRef: string;
	responseUrl: string;
	currentVersions?: { app?: string; extension?: string };
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
				label: { type: "plain_text", text: "배포할 커밋 / 태그" },
				element: {
					type: "static_select",
					action_id: DEPLOY_MODAL_FIELDS.ref.actionId,
					options,
					...(initialOption ? { initial_option: initialOption } : {}),
				},
			},
			buildVersionInputBlock({
				field: DEPLOY_MODAL_FIELDS.appVersion,
				label: "앱 버전 (비우면 그대로)",
				currentVersion: currentVersions?.app,
			}),
			buildVersionInputBlock({
				field: DEPLOY_MODAL_FIELDS.extensionVersion,
				label: "확장 버전 (비우면 그대로)",
				currentVersion: currentVersions?.extension,
			}),
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
