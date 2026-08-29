import {
	buildDeployModal,
	DEPLOY_MODAL_CALLBACK_ID,
	DEPLOY_MODAL_FIELDS,
	DEPLOY_TARGET_LABELS,
	dispatchRelease,
	fetchRefOptions,
	getGithubRepository,
	openSlackModal,
	readVerifiedSlackForm,
	respondToSlack,
	type TDeployTarget,
} from "@src/modules/slack";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Slack 버튼·모달 제출을 받아 배포를 트리거합니다.
 *
 * Slack App > Interactivity & Shortcuts > Request URL 에 등록합니다:
 *   https://<프로덕션 도메인>/api/slack/interactivity
 *
 * @description Slack은 3초 안에 200을 못 받으면 사용자에게 실패로 표시합니다.
 * 그래서 무거운 작업을 만들지 않고, 배포 진행 상황은 워크플로가 스스로 알리게 둡니다.
 */

// node:crypto로 서명을 검증하므로 Node 런타임이 필요합니다.
export const runtime = "nodejs";

/** 버튼 value에 실려 오는 값. .github/scripts/lib/slack-blocks.mjs가 만듭니다. */
interface IFDeployButtonValue {
	/** 배포 대상 (다른 버전 버튼에는 없습니다) */
	target?: TDeployTarget;
	/** 배포할 커밋 SHA */
	ref: string;
}

const buildRunUrl = (): string =>
	`https://github.com/${getGithubRepository()}/actions/workflows/release.yml`;

/** 버튼 하나로 즉시 배포하는 경로. */
const handleDeployButton = async ({
	value,
	responseUrl,
	userId,
}: {
	value: IFDeployButtonValue;
	responseUrl: string;
	userId: string;
}): Promise<void> => {
	if (!value.target) {
		throw new Error("배포 대상이 없는 버튼입니다");
	}

	await dispatchRelease({ targets: [value.target], ref: value.ref });

	await respondToSlack({
		responseUrl,
		text: `🚀 <@${userId}> 님이 *${DEPLOY_TARGET_LABELS[value.target]}* 배포를 시작했습니다 — \`${value.ref.slice(0, 7)}\`\n<${buildRunUrl()}|워크플로 보기>`,
	});
};

/** "다른 버전…" 버튼 — 대상과 ref를 고르는 모달을 엽니다. */
const handleCustomDeployButton = async ({
	value,
	triggerId,
	responseUrl,
}: {
	value: IFDeployButtonValue;
	triggerId: string;
	responseUrl: string;
}): Promise<void> => {
	const refOptions = await fetchRefOptions();

	await openSlackModal({
		triggerId,
		view: buildDeployModal({
			refOptions:
				refOptions.length > 0
					? refOptions
					: [
							{
								label: `${value.ref.slice(0, 7)} (알림 시점 커밋)`,
								value: value.ref,
							},
						],
			defaultRef: value.ref,
			responseUrl,
		}),
	});
};

/** 모달 제출 — 여러 대상을 한 번에 배포합니다. */
const handleModalSubmission = async (payload: {
	view: {
		private_metadata: string;
		state: { values: Record<string, Record<string, unknown>> };
	};
	user: { id: string };
}): Promise<NextResponse> => {
	const { values } = payload.view.state;
	const targets = (
		(
			values[DEPLOY_MODAL_FIELDS.targets.blockId]?.[
				DEPLOY_MODAL_FIELDS.targets.actionId
			] as { selected_options?: Array<{ value: string }> }
		)?.selected_options ?? []
	).map(({ value }) => value as TDeployTarget);

	const ref = (
		values[DEPLOY_MODAL_FIELDS.ref.blockId]?.[
			DEPLOY_MODAL_FIELDS.ref.actionId
		] as { selected_option?: { value: string } }
	)?.selected_option?.value;

	// 대상을 하나도 안 고르면 워크플로의 preflight가 실패로 끝납니다.
	// 그 전에 모달 안에서 바로 알려주는 편이 낫습니다.
	if (targets.length === 0 || !ref) {
		return NextResponse.json({
			response_action: "errors",
			errors: {
				[DEPLOY_MODAL_FIELDS.targets.blockId]:
					"배포할 대상을 하나 이상 고르세요",
			},
		});
	}

	try {
		await dispatchRelease({ targets, ref });
	} catch (error) {
		// 모달에는 response_url이 없어 후속 메시지를 보낼 수 없습니다.
		// 실패 사유를 모달 안에 그대로 띄워야 사용자가 알 수 있습니다.
		console.error("모달에서 배포 실행 실패:", error);

		return NextResponse.json({
			response_action: "errors",
			errors: {
				[DEPLOY_MODAL_FIELDS.ref.blockId]:
					`배포를 시작하지 못했습니다 — ${error instanceof Error ? error.message.slice(0, 150) : String(error)}`,
			},
		});
	}

	const { responseUrl } = JSON.parse(payload.view.private_metadata) as {
		responseUrl: string;
	};
	const targetLabels = targets
		.map((target) => DEPLOY_TARGET_LABELS[target])
		.join(", ");

	await respondToSlack({
		responseUrl,
		text: `🚀 <@${payload.user.id}> 님이 *${targetLabels}* 배포를 시작했습니다 — \`${ref.slice(0, 7)}\`\n<${buildRunUrl()}|워크플로 보기>`,
	});

	return new NextResponse(null, { status: 200 });
};

export async function POST(request: NextRequest) {
	const form = await readVerifiedSlackForm(request);

	if (!form) {
		return new NextResponse("invalid signature", { status: 401 });
	}

	const rawPayload = form.get("payload");

	if (!rawPayload) {
		return new NextResponse("missing payload", { status: 400 });
	}

	try {
		// biome-ignore lint/suspicious/noExplicitAny: Slack 상호작용 payload는 타입이 유니온으로 갈라져, 분기 후 좁혀 씁니다.
		const payload = JSON.parse(rawPayload) as any;

		if (payload.type === "view_submission") {
			if (payload.view?.callback_id !== DEPLOY_MODAL_CALLBACK_ID) {
				return new NextResponse(null, { status: 200 });
			}

			return await handleModalSubmission(payload);
		}

		if (payload.type !== "block_actions") {
			return new NextResponse(null, { status: 200 });
		}

		const action = payload.actions?.[0];

		// url만 달린 링크 버튼("워크플로 보기")도 상호작용을 보냅니다. 확인만 하고 끝냅니다.
		if (!action?.value) {
			return new NextResponse(null, { status: 200 });
		}

		const value = JSON.parse(action.value) as IFDeployButtonValue;

		if (action.action_id === "deploy_custom") {
			await handleCustomDeployButton({
				value,
				triggerId: payload.trigger_id,
				responseUrl: payload.response_url,
			});

			return new NextResponse(null, { status: 200 });
		}

		await handleDeployButton({
			value,
			responseUrl: payload.response_url,
			userId: payload.user.id,
		});

		return new NextResponse(null, { status: 200 });
	} catch (error) {
		console.error("Slack 상호작용 처리 실패:", error);

		// 500만 돌려주면 Slack에는 정체불명의 에러만 뜹니다. 원인을 본인에게만 보여줍니다.
		const responseUrl = JSON.parse(rawPayload)?.response_url;

		if (responseUrl) {
			await respondToSlack({
				responseUrl,
				isEphemeral: true,
				text: `⚠️ 배포를 시작하지 못했습니다 — ${error instanceof Error ? error.message : String(error)}`,
			});

			return new NextResponse(null, { status: 200 });
		}

		return new NextResponse("internal error", { status: 500 });
	}
}
