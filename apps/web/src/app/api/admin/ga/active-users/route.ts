import {
	fetchActiveUsersByDate,
	GA4_CACHE_SECONDS,
	GA4_SERVICE_ACCOUNT_JSON,
	type IFActiveUsersRow,
} from "@src/modules/ga";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { AdminService } from "@web-memo/shared/utils";
import { unstable_cache } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 관리자 대시보드가 그릴 GA 기준 일자별 활성 사용자 추이.
 *
 * @description 관리자 대시보드의 다른 숫자는 전부 Supabase를 직접 센 결과라, 사람들이
 * 무엇을 하다가 어디에서 멈췄는지를 보여주지 못합니다. 그 자리를 GA4가 메웁니다.
 *
 * 인증을 라우트가 직접 거는 이유는 `admin/layout.tsx`의 리다이렉트가 `/api/*`에는
 * 적용되지 않기 때문입니다. OpenAI 라우트가 쓰는 `origin` 검사는 확장에서 부르는
 * API를 위한 것이라 관리자 전용 경로에는 맞지 않습니다.
 */

// 서비스 계정 JWT의 RS256 서명에 node:crypto가 필요합니다.
export const runtime = "nodejs";

/** `days` 파라미터의 기본값과 허용 범위. */
const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

/**
 * GA4 조회 결과를 6시간 동안 재사용합니다.
 *
 * @description 응답 자체가 아니라 조회 결과만 캐시합니다. 관리자 전용 데이터라
 * CDN이나 브라우저의 공유 캐시에 실리면 안 되고, 인증은 매 요청 새로 확인되어야 합니다.
 * 캐시가 막아 주는 것은 GA4 Data API 토큰 쿼터 소모뿐입니다.
 *
 * 키를 이루는 인자에 `days`만 두고 서비스 계정 키는 클로저로 읽는 이유는, 인자가
 * 그대로 캐시 키로 직렬화되기 때문입니다. 시크릿을 넘기면 캐시 저장소에 남습니다.
 */
const readCachedActiveUsers = unstable_cache(
	async (days: number) => {
		// 호출부가 이미 걸러내므로 실제로 도달하지 않습니다. 클로저 안에서는 타입이
		// 좁혀지지 않아 두는 가드입니다.
		if (!GA4_SERVICE_ACCOUNT_JSON) {
			throw new Error("GA4_SERVICE_ACCOUNT_JSON이 설정되지 않았습니다.");
		}

		return await fetchActiveUsersByDate({
			serviceAccountJson: GA4_SERVICE_ACCOUNT_JSON,
			days,
		});
	},
	["admin-ga-active-users"],
	{ revalidate: GA4_CACHE_SECONDS },
);

export async function GET(request: NextRequest) {
	const supabaseClient = await getSupabaseClient();
	const {
		data: { user },
	} = await supabaseClient.auth.getUser();

	if (!user) {
		return NextResponse.json({ message: "권한이 없습니다." }, { status: 403 });
	}

	const isAdmin = await new AdminService(supabaseClient).checkIsAdmin(user.id);

	if (!isAdmin) {
		return NextResponse.json({ message: "권한이 없습니다." }, { status: 403 });
	}

	const days = readDays(request.nextUrl.searchParams.get("days"));

	if (days === null) {
		return NextResponse.json(
			{
				message: `days는 ${MIN_DAYS} 이상 ${MAX_DAYS} 이하의 정수여야 합니다.`,
			},
			{ status: 400 },
		);
	}

	// 크리덴셜이 아직 없는 것은 조회 실패와 다른 상태입니다. 500을 던지면 화면이
	// 에러 바운더리로 빠져 나머지 관리 지표까지 못 보게 되고, 조용히 빈 배열만
	// 돌려주면 "연결 없음"과 "정말 사용자가 없음"을 화면이 구분할 수 없습니다.
	if (!GA4_SERVICE_ACCOUNT_JSON) {
		return jsonWithoutSharedCache({ rows: [], asOf: null, connected: false });
	}

	try {
		const { rows, asOf } = await readCachedActiveUsers(days);

		return jsonWithoutSharedCache({ rows, asOf, connected: true });
	} catch (error) {
		console.error("GA4 활성 사용자 조회 실패:", error);

		return NextResponse.json(
			{ message: "GA4 활성 사용자를 조회하지 못했습니다." },
			{ status: 500 },
		);
	}
}

/** 범위를 벗어나거나 정수가 아니면 null을 돌려 호출부가 400으로 거절하게 합니다. */
const readDays = (raw: string | null) => {
	if (raw === null) {
		return DEFAULT_DAYS;
	}

	const days = Number(raw);

	if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
		return null;
	}

	return days;
};

/** 관리자 전용 데이터라 공유 캐시에 실리지 않도록 못을 박습니다. */
const jsonWithoutSharedCache = (body: IFActiveUsersResponse) =>
	NextResponse.json(body, {
		headers: { "Cache-Control": "private, no-store" },
	});

/** 활성 사용자 추이 응답. */
interface IFActiveUsersResponse {
	/** 날짜 오름차순. 활성 사용자가 0인 날과 미연결 상태에서는 비어 있습니다 */
	rows: IFActiveUsersRow[];
	/** 집계가 끝난 마지막 날(YYYYMMDD). 미연결이면 null입니다 */
	asOf: string | null;
	/** GA4 크리덴셜이 설정되어 실제로 조회했는지 여부 */
	connected: boolean;
}
