import {
	buildDeployModal,
	commitVersionBump,
	DEPLOY_MODAL_CALLBACK_ID,
	DEPLOY_MODAL_FIELDS,
	DEPLOY_TARGET_LABELS,
	dispatchRelease,
	fetchCurrentVersions,
	fetchDefaultBranchSha,
	fetchRefOptions,
	getGithubRepository,
	isVersionAhead,
	notifySlackSafely,
	openSlackModal,
	parseSemver,
	readVerifiedSlackForm,
	type TDeployTarget,
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
			fetchCurrentVersions(),
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

/** 실제로 올린 버전 한 건. 배포 시작 메시지에 그대로 실립니다. */
interface IFVersionBump {
	target: TDeployTarget;
	/** 올리기 전 버전. 조회에 실패했으면 없습니다. */
	from?: string;
	to: string;
}

const VERSION_FIELDS: Record<
	"app" | "extension",
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

/**
 * 버전 입력 한 칸을 검증합니다. 통과하면 null.
 *
 * @description 반려 사유는 그 값을 적은 입력 블록에 붙입니다. 대상 체크박스 쪽에
 * 몰아 붙이면 어느 칸이 틀렸는지 보이지 않습니다.
 */
const validateVersionInput = ({
	input,
	target,
	targets,
	currentVersion,
}: {
	input: string;
	target: "app" | "extension";
	targets: TDeployTarget[];
	currentVersion?: string;
}): IFModalError | null => {
	const { blockId } = VERSION_FIELDS[target];

	// 대상에 없는 트랙의 버전만 올리면 커밋만 남고 아무것도 배포되지 않습니다.
	if (!targets.includes(target)) {
		return {
			blockId,
			message: `버전을 올리려면 배포 대상에 ${DEPLOY_TARGET_LABELS[target]}을(를) 함께 고르세요`,
		};
	}

	const parsed = parseSemver(input);

	if (!parsed) {
		return {
			blockId,
			message: `버전은 1.2.3 형식으로 적으세요 — 받은 값 "${input}"`,
		};
	}

	if (!isVersionAhead({ nextVersion: parsed, currentVersion })) {
		return {
			blockId,
			message: `현재 ${currentVersion}보다 높은 버전을 적으세요`,
		};
	}

	return null;
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

	const appVersion = readTextInput(values, DEPLOY_MODAL_FIELDS.appVersion);
	const extensionVersion = readTextInput(
		values,
		DEPLOY_MODAL_FIELDS.extensionVersion,
	);

	let deployRef = ref;
	let bumpCommitSha: string | undefined;
	const bumps: IFVersionBump[] = [];

	if (appVersion || extensionVersion) {
		try {
			const [currentVersions, defaultBranchSha] = await Promise.all([
				fetchCurrentVersions(),
				fetchDefaultBranchSha(),
			]);

			// 버전 커밋은 master 끝에 쌓이는데 배포할 내용이 과거면 둘이 다른 트리가 됩니다.
			// 태그를 고른 경우도 SHA가 다르므로 여기서 함께 걸립니다.
			if (ref !== defaultBranchSha) {
				return respondWithModalError({
					blockId: DEPLOY_MODAL_FIELDS.ref.blockId,
					message: `버전을 올리려면 master 최신 커밋(${defaultBranchSha.slice(0, 7)})을 고르세요 — 과거 커밋·태그에는 버전 커밋을 쌓을 수 없습니다`,
				});
			}

			// 커밋을 만들기 전에 두 칸을 모두 검증합니다. 하나라도 틀리면 master는 그대로입니다.
			const requested: Array<{ target: "app" | "extension"; input: string }> = [
				...(appVersion ? [{ target: "app" as const, input: appVersion }] : []),
				...(extensionVersion
					? [{ target: "extension" as const, input: extensionVersion }]
					: []),
			];

			for (const { target, input } of requested) {
				const error = validateVersionInput({
					input,
					target,
					targets,
					currentVersion: currentVersions[target],
				});

				if (error) return respondWithModalError(error);
			}

			bumpCommitSha = await commitVersionBump({
				appVersion,
				extensionVersion,
				requestedBy: payload.user.username ?? payload.user.id,
			});
			deployRef = bumpCommitSha;

			bumps.push(
				...requested.map(({ target, input }) => ({
					target,
					from: currentVersions[target],
					to: input,
				})),
			);
		} catch (error) {
			console.error("버전 커밋 실패:", error);

			return respondWithModalError({
				blockId: DEPLOY_MODAL_FIELDS.ref.blockId,
				message: `버전 커밋을 만들지 못했습니다 — ${error instanceof Error ? error.message.slice(0, 150) : String(error)}`,
			});
		}
	}

	try {
		await dispatchRelease({ targets, ref: deployRef });
	} catch (error) {
		// 모달에는 response_url이 없어 후속 메시지를 보낼 수 없습니다.
		// 실패 사유를 모달 안에 그대로 띄워야 사용자가 알 수 있습니다.
		console.error("모달에서 배포 실행 실패:", error);

		const detail =
			error instanceof Error ? error.message.slice(0, 150) : String(error);

		return respondWithModalError({
			blockId: DEPLOY_MODAL_FIELDS.ref.blockId,
			// 커밋은 이미 master에 남았습니다. 이 사실을 빼면 다음 시도에서 버전이
			// "현재 버전 이하"로 반려되는데 왜 그런지 알 길이 없습니다.
			message: bumpCommitSha
				? `배포를 시작하지 못했습니다 — ${detail} / 버전 커밋 ${bumpCommitSha.slice(0, 7)}은 master에 이미 올라갔으니 그 커밋으로 다시 배포하세요`
				: `배포를 시작하지 못했습니다 — ${detail}`,
		});
	}

	const { responseUrl } = JSON.parse(payload.view.private_metadata) as {
		responseUrl: string;
	};
	const targetLabels = targets
		.map((target) => DEPLOY_TARGET_LABELS[target])
		.join(", ");

	await notifySlackSafely({
		responseUrl,
		text: [
			`🚀 <@${payload.user.id}> 님이 *${targetLabels}* 배포를 시작했습니다`,
			...bumps.map(
				({ target, from, to }) =>
					`${DEPLOY_TARGET_LABELS[target]} ${from ?? "?"} → *${to}*`,
			),
			// 버전업 배포는 방금 만든 커밋을 올립니다. 선택지 라벨(고른 커밋의 제목)을
			// 그대로 쓰면 실제로 배포되는 커밋과 다른 것을 가리키게 됩니다.
			bumpCommitSha
				? `버전 커밋 \`${bumpCommitSha.slice(0, 7)}\`을 master에 만들고 그 커밋을 배포합니다`
				: (selectedRefOption?.text?.text ?? `\`${ref.slice(0, 7)}\``),
			`<${buildRunUrl()}|워크플로 보기>`,
		].join("\n"),
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
