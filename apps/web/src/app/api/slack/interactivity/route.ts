import {
	buildDeployModal,
	DEPLOY_MODAL_CALLBACK_ID,
	DEPLOY_MODAL_FIELDS,
	DEPLOY_TARGET_LABELS,
	dispatchRelease,
	fetchCurrentVersions,
	fetchRefOptions,
	getGithubRepository,
	notifySlackSafely,
	openSlackModal,
	readVerifiedSlackForm,
	type TDeployTarget,
	type TVersionedTarget,
	updateSlackModal,
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

/**
 * 올릴 버전 문자열 형식.
 *
 * @description .github/scripts/bump-versions.mjs 가 같은 규칙을 다시 검사합니다.
 * 런타임이 달라 상수를 공유할 수 없어 양쪽에 둡니다 — 한쪽만 고치지 마세요.
 */
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * `1.2.10` 이 `1.2.9` 보다 크다고 판정합니다.
 *
 * @description 문자열 비교로는 `"1.2.10" < "1.2.9"` 가 되어 정상적인 버전업이 막힙니다.
 */
const isGreaterVersion = (next: string, current: string): boolean => {
	const nextParts = next.split(".").map(Number);
	const currentParts = current.split(".").map(Number);

	for (let index = 0; index < 3; index += 1) {
		if (nextParts[index] !== currentParts[index]) {
			return nextParts[index] > currentParts[index];
		}
	}

	return false;
};

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

	await notifySlackSafely({
		responseUrl,
		text: `🚀 <@${userId}> 님이 *${DEPLOY_TARGET_LABELS[value.target]}* 배포를 시작했습니다 — \`${value.ref.slice(0, 7)}\`\n<${buildRunUrl()}|워크플로 보기>`,
	});
};

/**
 * "다른 버전…" 버튼 — 대상과 ref를 고르는 모달을 엽니다.
 *
 * @description trigger_id는 발급 후 3초 안에 써야 합니다. 그 앞에 GitHub 조회를 두면
 * 콜드 스타트와 겹쳐 `expired_trigger_id`로 죽고, 사용자에게는 버튼이 아무 반응 없는
 * 것처럼 보입니다. 그래서 외부 호출 없이 모달을 **먼저** 띄우고, 태그·커밋 목록은
 * views.update로 나중에 채웁니다.
 */
const handleCustomDeployButton = async ({
	value,
	triggerId,
	responseUrl,
}: {
	value: IFDeployButtonValue;
	triggerId: string;
	responseUrl: string;
}): Promise<void> => {
	const fallbackOption = {
		label: `${value.ref.slice(0, 7)} (알림 시점 커밋)`,
		value: value.ref,
	};

	const viewId = await openSlackModal({
		triggerId,
		view: buildDeployModal({
			refOptions: [fallbackOption],
			defaultRef: value.ref,
			responseUrl,
			isLoading: true,
		}),
	});

	// 목록을 못 받아도 모달은 이미 떠 있고 알림 시점 커밋으로는 배포할 수 있습니다.
	try {
		const refOptions = await fetchRefOptions();

		if (refOptions.length === 0) return;

		await updateSlackModal({
			viewId,
			view: buildDeployModal({
				refOptions,
				defaultRef: value.ref,
				responseUrl,
			}),
		});
	} catch (error) {
		console.error("모달의 ref 목록 갱신 실패:", error);
	}
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

	const readVersionInput = (field: { blockId: string; actionId: string }) =>
		(
			values[field.blockId]?.[field.actionId] as { value?: string | null }
		)?.value?.trim() ?? "";

	const versionInputs: Array<{
		target: TVersionedTarget;
		label: string;
		field: { blockId: string; actionId: string };
		value: string;
	}> = [
		{
			target: "app",
			label: "앱",
			field: DEPLOY_MODAL_FIELDS.appVersion,
			value: readVersionInput(DEPLOY_MODAL_FIELDS.appVersion),
		},
		{
			target: "extension",
			label: "확장",
			field: DEPLOY_MODAL_FIELDS.extensionVersion,
			value: readVersionInput(DEPLOY_MODAL_FIELDS.extensionVersion),
		},
	];
	const enteredVersions = versionInputs.filter(({ value }) => value !== "");

	const errors: Record<string, string> = {};

	// 대상을 하나도 안 고르면 워크플로의 preflight가 실패로 끝납니다.
	// 그 전에 모달 안에서 바로 알려주는 편이 낫습니다.
	if (targets.length === 0 || !ref) {
		errors[DEPLOY_MODAL_FIELDS.targets.blockId] =
			"배포할 대상을 하나 이상 고르세요";
	}

	for (const { target, label, field, value } of enteredVersions) {
		if (!VERSION_PATTERN.test(value)) {
			errors[field.blockId] = "x.y.z 형식으로 적으세요 (예: 1.0.9)";
			continue;
		}

		// 버전만 올려놓고 그 대상을 안 내보내면 아무도 쓰지 않는 커밋이 master에 남습니다.
		if (!targets.includes(target)) {
			errors[field.blockId] = `${label}을 배포 대상으로 함께 고르세요`;
		}
	}

	// 형식이 이미 틀렸으면 현재 버전을 받아올 이유가 없습니다(3초 예산을 아낍니다).
	if (Object.keys(errors).length === 0 && enteredVersions.length > 0) {
		const currentVersions = await fetchCurrentVersions();

		for (const { target, field, value } of enteredVersions) {
			const currentVersion = currentVersions[target];

			// 못 받았으면 건너뜁니다. 워크플로의 bump 스크립트가 같은 검사를 다시 합니다.
			if (!currentVersion) {
				continue;
			}

			if (!isGreaterVersion(value, currentVersion)) {
				errors[field.blockId] =
					`현재 ${currentVersion} 보다 큰 버전을 적으세요`;
			}
		}
	}

	if (Object.keys(errors).length > 0) {
		return NextResponse.json({ response_action: "errors", errors });
	}

	const appVersion = versionInputs[0].value;
	const extensionVersion = versionInputs[1].value;

	try {
		await dispatchRelease({
			targets,
			// 위에서 빈 ref는 이미 걸렀습니다. 워크플로는 빈 값을 "브랜치 최신"으로 읽습니다.
			ref: ref ?? "",
			appVersion,
			extensionVersion,
		});
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
	// 버전을 올릴 때는 고른 ref가 쓰이지 않습니다. 메시지에도 그대로 드러냅니다 —
	// 과거 커밋을 골라놓고 최신이 나간 줄 모르는 상황을 만들지 않기 위해서입니다.
	const sourceLabel =
		enteredVersions.length > 0
			? `${enteredVersions.map(({ label, value }) => `${label} v${value}`).join(" · ")} 로 올려 master 최신에서`
			: `\`${(ref ?? "").slice(0, 7)}\` 으로`;

	await notifySlackSafely({
		responseUrl,
		text: `🚀 <@${payload.user.id}> 님이 *${targetLabels}* 배포를 시작했습니다 — ${sourceLabel}\n<${buildRunUrl()}|워크플로 보기>`,
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
			await notifySlackSafely({
				responseUrl,
				isEphemeral: true,
				text: `⚠️ 배포를 시작하지 못했습니다 — ${error instanceof Error ? error.message : String(error)}`,
			});

			return new NextResponse(null, { status: 200 });
		}

		return new NextResponse("internal error", { status: 500 });
	}
}
