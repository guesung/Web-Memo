import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

/**
 * 컨테이너 blue-green 전환용 헬스체크 (infra/oracle).
 *
 * Caddy는 blue·green 두 컨테이너를 이 경로로 1초마다 확인해, 200인 쪽으로만 트래픽을 보냅니다.
 * 전환은 활성 색 파일 한 줄을 바꾸는 것으로 끝나 Caddy 설정을 다시 불러오지 않습니다.
 * 리로드하면 그 순간 들어온 요청이 끊기기 때문입니다.
 *
 * - `DEPLOY_COLOR`가 없으면(Vercel·로컬) 항상 200입니다.
 * - 활성 색 파일을 아직 만들지 않았으면 200입니다. 첫 기동 때 두 색 모두 받게 둡니다.
 */
const ACTIVE_COLOR_FILE = "/run/webmemo/active";

export const dynamic = "force-dynamic";

const readActiveColor = async () => {
	try {
		return (await readFile(ACTIVE_COLOR_FILE, "utf8")).trim();
	} catch {
		return null;
	}
};

export async function GET() {
	const color = process.env.DEPLOY_COLOR;
	if (!color) return NextResponse.json({ ok: true });

	const active = await readActiveColor();
	const isActive = active === null || active === color;

	return NextResponse.json(
		{ ok: isActive, color, active },
		{ status: isActive ? 200 : 503 },
	);
}
