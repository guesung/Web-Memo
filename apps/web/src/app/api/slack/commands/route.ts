import {
	dispatchVersionReport,
	readVerifiedSlackForm,
} from "@src/modules/slack";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Slack 슬래시 커맨드를 받습니다.
 *
 * Slack App > Slash Commands > Request URL 에 등록합니다:
 *   https://<프로덕션 도메인>/api/slack/commands
 *
 * @description 스토어 조회에 필요한 자격 증명은 GitHub Actions에만 두기로 했으므로
 * (docs/release-flow.md 참고) 여기서는 versions.yml을 킥하기만 하고, 실제 결과는
 * 워크플로가 채널에 게시합니다. 그래서 즉시 응답은 "조회 중"이 됩니다.
 */

// node:crypto로 서명을 검증하므로 Node 런타임이 필요합니다.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const form = await readVerifiedSlackForm(request);

	if (!form) {
		return new NextResponse("invalid signature", { status: 401 });
	}

	const userId = form.get("user_id") ?? "";

	try {
		await dispatchVersionReport({ requestedBy: userId });

		return NextResponse.json({
			response_type: "ephemeral",
			text: "📦 배포 현황을 조회하고 있습니다. 잠시 뒤 채널에 올라옵니다.",
		});
	} catch (error) {
		console.error("배포 현황 조회 실행 실패:", error);

		return NextResponse.json({
			response_type: "ephemeral",
			text: `⚠️ 조회를 시작하지 못했습니다 — ${error instanceof Error ? error.message : String(error)}`,
		});
	}
}
