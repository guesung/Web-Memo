import { NextResponse } from "next/server";

/**
 * 배포된 웹 인스턴스가 스스로 밝히는 빌드 식별자.
 *
 * 웹은 버전 번호를 갖지 않으므로(docs/versioning.md) 커밋 SHA가 유일한 식별자입니다.
 * Vercel API로 배포를 역추적하는 대신 이 엔드포인트를 두는 이유는, 별칭이 바뀌거나
 * 롤백이 있어도 "지금 응답하는 인스턴스"의 진실이 하나로 유지되기 때문입니다.
 *
 * .github/scripts/lib/store-versions.mjs 의 fetchWebVersion이 이 응답을 읽습니다.
 */

/** 배포 식별 정보. 값이 없으면 로컬 개발 등 Vercel 밖에서 돌고 있다는 뜻입니다. */
interface IFVersionResponse {
	/** 배포된 커밋의 전체 SHA */
	commit: string | null;
	/** 배포된 브랜치명 */
	branch: string | null;
	/** 빌드 시각(ISO 8601) */
	builtAt: string | null;
	/** Vercel 환경 (production / preview / development) */
	environment: string | null;
}

// 빌드 시점에 고정되어야 하는 값이라 모듈 스코프에서 한 번만 읽습니다.
//
// 이 앱은 Vercel이 아니라 GitHub Actions 러너에서 `vercel build`로 빌드됩니다(cd-web.yml).
// 그쪽에서는 Vercel이 자기 빌드 환경에만 넣어주는 VERCEL_GIT_* 이 비어 있을 수 있어,
// 러너가 항상 갖고 있는 GITHUB_* 로 물러섭니다.
const VERSION: IFVersionResponse = {
	commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
	branch:
		process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || null,
	builtAt: new Date().toISOString(),
	environment: process.env.VERCEL_ENV ?? null,
};

export const dynamic = "force-static";

export async function GET() {
	return NextResponse.json(VERSION);
}
