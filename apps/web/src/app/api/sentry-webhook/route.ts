import {
	formatSentryAlertText,
	getSentryAlertSlackChannel,
	readVerifiedSentryWebhook,
} from "@src/modules/sentry";
import { postSlackMessage } from "@src/modules/slack";
import { NextResponse } from "next/server";

/**
 * Sentry 웹훅을 받아 Slack으로 릴레이합니다.
 *
 * Sentry Settings > Developer Settings > New Internal Integration 에서
 * Webhook URL을 등록합니다:
 *   https://<프로덕션 도메인>/api/sentry-webhook
 * Webhooks 탭에서 "issue" 리소스를 구독해야 합니다 ("error" 리소스는
 * Business/Enterprise 플랜 전용이라 무료 플랜에서는 구독할 수 없습니다).
 *
 * @description Slack 알림은 Sentry 유료 플랜 전용 기능이라, 무료로 쓸 수 있는
 * Internal Integration 웹훅을 받아 기존 Slack 봇 인프라로 대신 보냅니다.
 */

// node:crypto로 서명을 검증하므로 Node 런타임이 필요합니다.
export const runtime = "nodejs";

export async function POST(request: Request) {
	const payload = await readVerifiedSentryWebhook(request);

	if (!payload) {
		return new NextResponse("invalid signature", { status: 401 });
	}

	// issue 리소스가 아니거나(예: 설치 확인용 ping), 새로 생성된 이슈가 아니면
	// (resolved·assigned·ignored·unresolved 상태 변경) 조용히 무시합니다.
	// 상태 변경마다 알리면 Slack이 스팸이 됩니다.
	if (!payload.data?.issue || payload.action !== "created") {
		return NextResponse.json({ ok: true });
	}

	try {
		await postSlackMessage({
			channel: getSentryAlertSlackChannel(),
			text: formatSentryAlertText(payload),
		});
	} catch (error) {
		console.error("Sentry 알림을 Slack으로 릴레이하는 데 실패했습니다:", error);
	}

	return NextResponse.json({ ok: true });
}
