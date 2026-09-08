import {
	buildDeployModal,
	commitVersionBump,
	DEPLOY_MODAL_CALLBACK_ID,
	DEPLOY_MODAL_FIELDS,
	DEPLOY_TARGET_LABELS,
	dispatchRelease,
	fetchCurrentVersionsForModal,
	fetchDefaultBranchSha,
	fetchRefOptions,
	fetchVersionForBump,
	getGithubRepository,
	notifySlackSafely,
	openSlackModal,
	readVerifiedSlackForm,
	rejectVersionInput,
	runAfterResponse,
	type TDeployTarget,
	type TVersionRejection,
	type TVersionTrack,
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
	/** ref의 커밋 제목. 해시만으로는 무엇을 올리는지 알 수 없어 함께 실어 보냅니다. */
	subject?: string;
}

/** Slack 문구에 실을 만큼만 자른 에러 설명. */
const describeError = (error: unknown): string =>
	error instanceof Error ? error.message.slice(0, 150) : String(error);

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

	await notifySlackSafely({
		responseUrl,
		text: [
			`🚀 <@${userId}> 님이 *${DEPLOY_TARGET_LABELS[value.target]}* 배포를 시작했습니다`,
			value.subject ?? `\`${value.ref.slice(0, 7)}\``,
			`<${buildRunUrl()}|워크플로 보기>`,
		].join("\n"),
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
		// 순차로 기다리면 3초 예산(views.open ~300ms + 조회 ≤1s + views.update ~300ms)을
		// 넘깁니다. 두 조회는 서로 독립이므로 함께 보냅니다.
		const [refOptions, currentVersions] = await Promise.all([
			fetchRefOptions(),
			fetchCurrentVersionsForModal(),
		]);

		// 둘 다 비면 갱신할 내용이 없습니다. 지금 떠 있는 모달 그대로가 최선입니다.
		if (
			refOptions.length === 0 &&
			!currentVersions.app &&
			!currentVersions.extension
		) {
			return;
		}

		await updateSlackModal({
			viewId,
			view: buildDeployModal({
				refOptions: refOptions.length > 0 ? refOptions : [fallbackOption],
				defaultRef: value.ref,
				responseUrl,
				currentVersions,
			}),
		});
	} catch (error) {
		console.error("모달의 ref 목록 갱신 실패:", error);
	}
};

/** 모달 안에 그대로 띄울 반려 사유. 어느 칸이 틀렸는지 보이도록 blockId를 함께 답니다. */
interface IFModalError {
	blockId: string;
	message: string;
}

const respondWithModalError = ({
	blockId,
	message,
}: IFModalError): NextResponse =>
	NextResponse.json({
		response_action: "errors",
		errors: { [blockId]: message },
	});

const VERSION_FIELDS: Record<
	TVersionTrack,
	{ blockId: string; actionId: string }
> = {
	app: DEPLOY_MODAL_FIELDS.appVersion,
	extension: DEPLOY_MODAL_FIELDS.extensionVersion,
};

/** plain_text_input의 값. 비었으면 undefined — 두 버전 칸은 optional입니다. */
const readTextInput = (
	values: Record<string, Record<string, unknown>>,
	field: { blockId: string; actionId: string },
): string | undefined =>
	(
		(
			values[field.blockId]?.[field.actionId] as
				| { value?: string | null }
				| undefined
		)?.value ?? ""
	).trim() || undefined;

const VERSION_REJECTION_MESSAGES: Record<TVersionRejection, string> = {
	"not-semver": "버전은 1.2.3 형식으로 적으세요",
	"not-ahead": "현재 버전보다 높은 버전을 적으세요",
};

/**
 * 버전을 올려도 되는지 확인합니다. 통과하면 null.
 *
 * @description 네트워크를 치므로 동기 구간에 들어갑니다 — 여기서 통과한 뒤에야
 * 커밋·배포가 배경으로 넘어가고, 그 뒤로는 모달이 닫혀 반려할 수단이 없습니다.
 * 반려 사유는 그 값을 적은 입력 블록에 붙입니다. 대상 체크박스 쪽에 몰아 붙이면
 * 어느 칸이 틀렸는지 보이지 않습니다.
 */
const validateVersionBump = async ({
	requested,
	targets,
	ref,
}: {
	requested: Array<{ track: TVersionTrack; input: string }>;
	targets: TDeployTarget[];
	ref: string;
}): Promise<
	{ error: IFModalError } | { currentVersions: string[]; baseSha: string }
> => {
	for (const { track } of requested) {
		// 대상에 없는 트랙의 버전만 올리면 커밋만 남고 아무것도 배포되지 않습니다.
		if (!targets.includes(track)) {
			return {
				error: {
					blockId: VERSION_FIELDS[track].blockId,
					message: `버전을 올리려면 배포 대상에 ${DEPLOY_TARGET_LABELS[track]}을(를) 함께 고르세요`,
				},
			};
		}
	}

	// 형식·단조 증가 판정과 master 최신 판정에 필요한 조회를 한 번에 보냅니다.
	const [branchResult, ...versionResults] = await Promise.allSettled([
		fetchDefaultBranchSha(),
		...requested.map(({ track }) => fetchVersionForBump(track)),
	]);

	if (branchResult.status === "rejected") {
		return {
			error: {
				blockId: DEPLOY_MODAL_FIELDS.ref.blockId,
				message: "master의 최신 커밋을 확인하지 못했습니다 — 다시 시도하세요",
			},
		};
	}

	// 버전 커밋은 master 끝에 쌓이는데 배포할 내용이 과거면 둘이 다른 트리가 됩니다.
	// 태그를 고른 경우도 SHA가 다르므로 여기서 함께 걸립니다.
	if (ref !== branchResult.value) {
		return {
			error: {
				blockId: DEPLOY_MODAL_FIELDS.ref.blockId,
				message: `버전을 올리려면 master 최신 커밋(${branchResult.value.slice(0, 7)})을 고르세요 — 과거 커밋·태그에는 버전 커밋을 쌓을 수 없습니다`,
			},
		};
	}

	const currentVersions: string[] = [];

	for (const [index, { track, input }] of requested.entries()) {
		const { blockId } = VERSION_FIELDS[track];
		const result = versionResults[index];

		// 현재 버전을 모르는 채로 커밋을 쌓느니 다시 시도하게 하는 편이 낫습니다.
		if (result.status === "rejected") {
			return {
				error: {
					blockId,
					message: `현재 ${DEPLOY_TARGET_LABELS[track]} 버전을 확인하지 못했습니다 — 잠시 뒤 다시 시도하세요`,
				},
			};
		}

		const rejection = rejectVersionInput({
			input,
			currentVersion: result.value,
		});

		if (rejection) {
			return {
				error: {
					blockId,
					message: `${VERSION_REJECTION_MESSAGES[rejection]} — 현재 ${result.value}, 입력 "${input}"`,
				},
			};
		}

		currentVersions.push(result.value);
	}

	return { currentVersions, baseSha: branchResult.value };
};

/** 모달 제출 — 여러 대상을 한 번에 배포합니다. */
const handleModalSubmission = async (payload: {
	view: {
		private_metadata: string;
		state: { values: Record<string, Record<string, unknown>> };
	};
	user: { id: string; username?: string };
}): Promise<NextResponse> => {
	const { values } = payload.view.state;
	const targets = (
		(
			values[DEPLOY_MODAL_FIELDS.targets.blockId]?.[
				DEPLOY_MODAL_FIELDS.targets.actionId
			] as { selected_options?: Array<{ value: string }> }
		)?.selected_options ?? []
	).map(({ value }) => value as TDeployTarget);

	// 선택지 라벨에는 커밋 제목이 이미 들어 있습니다("8ae32c1 확장 버전을 올린다").
	// 배포 시작 메시지에 해시 대신 그 라벨을 그대로 씁니다.
	const selectedRefOption = (
		values[DEPLOY_MODAL_FIELDS.ref.blockId]?.[
			DEPLOY_MODAL_FIELDS.ref.actionId
		] as { selected_option?: { value: string; text?: { text?: string } } }
	)?.selected_option;
	const ref = selectedRefOption?.value;

	// 대상을 하나도 안 고르면 워크플로의 preflight가 실패로 끝납니다.
	// 그 전에 모달 안에서 바로 알려주는 편이 낫습니다.
	if (targets.length === 0 || !ref) {
		return respondWithModalError({
			blockId: DEPLOY_MODAL_FIELDS.targets.blockId,
			message: "배포할 대상을 하나 이상 고르세요",
		});
	}

	const { responseUrl } = JSON.parse(payload.view.private_metadata) as {
		responseUrl: string;
	};
	const targetLabels = targets
		.map((target) => DEPLOY_TARGET_LABELS[target])
		.join(", ");
	const startedBy = `🚀 <@${payload.user.id}> 님이 *${targetLabels}* 배포를 시작했습니다`;
	const runLink = `<${buildRunUrl()}|워크플로 보기>`;

	const requested: Array<{ track: TVersionTrack; input: string }> = (
		["app", "extension"] as const
	).flatMap((track) => {
		const input = readTextInput(values, VERSION_FIELDS[track]);

		return input ? [{ track, input }] : [];
	});

	// 버전을 안 올리면 dispatch 한 번이라 3초 안에 끝납니다. 동기 그대로 둡니다.
	if (requested.length === 0) {
		try {
			await dispatchRelease({ targets, ref });
		} catch (error) {
			// 모달에는 response_url이 없어 후속 메시지를 보낼 수 없습니다.
			// 실패 사유를 모달 안에 그대로 띄워야 사용자가 알 수 있습니다.
			console.error("모달에서 배포 실행 실패:", error);

			return respondWithModalError({
				blockId: DEPLOY_MODAL_FIELDS.ref.blockId,
				message: `배포를 시작하지 못했습니다 — ${describeError(error)}`,
			});
		}

		await notifySlackSafely({
			responseUrl,
			text: [
				startedBy,
				selectedRefOption?.text?.text ?? `\`${ref.slice(0, 7)}\``,
				runLink,
			].join("\n"),
		});

		return new NextResponse(null, { status: 200 });
	}

	const validated = await validateVersionBump({ requested, targets, ref });

	if ("error" in validated) return respondWithModalError(validated.error);

	const appVersion = requested.find(({ track }) => track === "app")?.input;
	const extensionVersion = requested.find(
		({ track }) => track === "extension",
	)?.input;

	// 여기서부터는 3초 예산 밖입니다 — 커밋(Git Data API 6왕복) + dispatch는 배경으로
	// 넘기고 모달을 바로 닫습니다. 모달이 닫힌 뒤에는 반려할 수단이 없으므로,
	// 되돌릴 수 없는 판정은 모두 위 validateVersionBump에서 끝냈습니다.
	await runAfterResponse(async () => {
		let bumpCommitSha: string | undefined;

		try {
			bumpCommitSha = await commitVersionBump({
				appVersion,
				extensionVersion,
				requestedBy: payload.user.username ?? payload.user.id,
				// 검증 때 확인한 그 커밋 위에만 얹습니다. 그 사이 master가 움직였으면
				// 커밋을 만들지 않고 던지고, 아래 catch가 "버전은 그대로" 경로로 알립니다.
				expectedBaseSha: validated.baseSha,
			});

			await dispatchRelease({ targets, ref: bumpCommitSha });
		} catch (error) {
			console.error("버전업 배포 실패:", error);

			await notifySlackSafely({
				responseUrl,
				// 커밋이 남았다면 master가 이미 움직인 것이라 채널이 알아야 합니다.
				// 아무것도 안 바뀐 실패는 요청자에게만 알려 채널을 어지럽히지 않습니다.
				isEphemeral: !bumpCommitSha,
				text: bumpCommitSha
					? [
							`⚠️ <@${payload.user.id}> 님의 *${targetLabels}* 배포를 시작하지 못했습니다 — ${describeError(error)}`,
							// 이 사실을 빼면 다시 시도할 때 "현재 버전 이하"로 반려되는
							// 이유를 알 길이 없습니다. 모달은 이미 닫혀 여기가 유일한 신호입니다.
							`버전 커밋 \`${bumpCommitSha.slice(0, 7)}\`는 master에 남았습니다 — 그 커밋을 골라 다시 배포하세요`,
						].join("\n")
					: `⚠️ <@${payload.user.id}> 님의 *${targetLabels}* 배포를 시작하지 못했습니다 — ${describeError(error)} / 버전은 그대로입니다`,
			});

			return;
		}

		await notifySlackSafely({
			responseUrl,
			text: [
				startedBy,
				...requested.map(
					({ track, input }, index) =>
						`${DEPLOY_TARGET_LABELS[track]} ${validated.currentVersions[index]} → *${input}*`,
				),
				// 버전업 배포는 방금 만든 커밋을 올립니다. 선택지 라벨(고른 커밋의 제목)을
				// 그대로 쓰면 실제로 배포되는 커밋과 다른 것을 가리키게 됩니다.
				`버전 커밋 \`${bumpCommitSha.slice(0, 7)}\`을 master에 만들고 그 커밋을 배포합니다`,
				runLink,
			].join("\n"),
		});
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
