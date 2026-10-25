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

	// issue 리소스가 아니면(예: 설치 확인용 ping) 조용히 무시합니다.
	if (!payload.data?.issue) {
		return NextResponse.json({ ok: true });
	}

	// 새로 생성된 이슈와, 한 번 resolve·ignore한 뒤 재발한 이슈만 알립니다.
	// resolved·assigned·ignored 상태 변경까지 알리면 Slack이 스팸이 되고,
	// 이미 unresolved인 이슈에 이벤트가 더 쌓이는 것은 이 리소스로는 알 수 없습니다.
	const isNotableAction =
		payload.action === "created" || payload.action === "unresolved";

	if (!isNotableAction) {
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
