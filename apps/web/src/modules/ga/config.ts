/**
 * GA4 Data API 조회에 필요한 설정값.
 *
 * @description 서비스 계정 키는 `apps/web/.env`(배포에서는 Vercel 환경변수)가 갖습니다.
 * `packages/env`에 두면 tsup이 빌드 시점에 번들로 인라인해 확장과 웹 클라이언트에
 * 그대로 실리므로 절대 그쪽으로 옮기지 않습니다.
 */

/**
 * 서비스 계정 키 JSON 전문.
 *
 * @description 모듈 최상단에서 한 번만 읽습니다. 값이 없으면 GA 연결이 아직
 * 준비되지 않은 상태이며, 라우트는 그것을 실패가 아니라 `connected: false`로 알립니다.
 */
export const GA4_SERVICE_ACCOUNT_JSON = process.env.GA4_SERVICE_ACCOUNT_JSON;

/**
 * 조회 대상 GA4 속성 ID.
 *
 * @description 비밀이 아니라서 기본값을 코드에 둡니다. `daily-ga-report.yml`도 같은
 * 판단으로 이 값을 GitHub Secrets가 아니라 워크플로 파일에 그대로 적고 있습니다.
 */
export const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "471860782";

/** GA4 Data API는 읽기 전용 scope로 충분합니다. */
export const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

/**
 * 조회 결과를 캐시할 시간(초). 6시간입니다.
 *
 * @description GA4 표준 속성의 보고서는 24~48시간 지연되므로 더 짧게 잡아도 새로운
 * 값이 나오지 않습니다. 반면 캐시가 없으면 대시보드를 새로고침할 때마다 GA4 Data API
 * 토큰 쿼터를 씁니다.
 *
 * 실측하면 이 조회 한 건이 일일 20만 토큰 중 **2토큰**을 씁니다. 캐시가 전혀 듣지
 * 않는다고 가정하고 하루 100번을 열어도 200토큰이라 일일 쿼터의 0.1%입니다. 나중에
 * 지표를 늘릴 때 여유를 가늠하는 근거로 쓰세요. 라우트가 `returnPropertyQuota`로
 * 매 호출의 실제 소모량을 서버 로그에 남기므로 이 값은 다시 확인할 수 있습니다.
 */
export const GA4_CACHE_SECONDS = 21600;

/**
 * 지표에 넣을 호스트의 전체 목록. **여기 없는 호스트의 사용자는 지표에서 빠집니다.**
 *
 * @description 도메인을 추가하거나 바꾸면 이 목록도 함께 고쳐야 합니다. 그러지 않으면
 * 새 도메인의 사용자가 조용히 빠진 채 그래프는 아무 이상 없이 그려집니다.
 *
 * `activeUsers`에는 `customEvent:build_env` 필터를 걸 수 없습니다. 그 파라미터는 커스텀
 * 이벤트에만 붙는데 `activeUsers`는 gtag가 자동 수집하는 값을 기반으로 하기 때문입니다.
 * 그래서 표준 차원 `hostName`으로 거릅니다.
 *
 * 지울 호스트를 적는 제외 목록이 아니라 남길 호스트를 적는 허용 목록인 이유는, 두 방식
 * 모두 조용히 틀리되 틀리는 방향이 다르기 때문입니다. 허용 목록은 새 도메인의 사용자를
 * 빠뜨려 숫자가 작아지지만 세는 대상이 일정합니다. 제외 목록은 모르는 도메인을 섞어
 * 숫자를 키우고 세는 대상을 흔듭니다. 이 그래프는 다음에 무엇을 만들지 고르는 데 쓰이므로
 * 작지만 일정한 숫자가 낫습니다.
 *
 * 가정이 아니라 실제로 일어난 일입니다. 조회해 보면 `www.webmemo.site`가 30일 기준 26명을
 * 데리고 들어와 있는데, 레포 전체를 뒤져도 이 도메인이 나오지 않습니다. 정체를 모르는
 * 도메인을 운영 지표에 넣으면 그 26명이 무엇인지 영영 묻지 않게 되므로 목록에서 뺐습니다.
 *
 * Vercel 프리뷰 배포는 커밋마다 새 도메인을 받지만 `-gueit214s-projects.vercel.app` 꼬리를
 * 공유하고, 운영 별칭은 그 꼬리를 갖지 않습니다. 나중에 허용 목록을 넓힐지 판단할 때 쓰는
 * 구분점입니다.
 */
export const INCLUDED_HOST_NAMES = [
	/** 운영 웹 */
	"www.webmemo.xyz",
	/** 추정 — Vercel 프로덕션 별칭. 30일 기준 56명이라는 규모가 실사용과 맞습니다 */
	"web-memos.vercel.app",
	/**
	 * 확장. 사이드 패널이 `chrome-extension://` 문서라 표준 차원 `hostName`에 호스트가
	 * 잡히지 않아 이 두 값으로 들어옵니다. 이 서비스의 주된 사용 경로라 활성 사용자의
	 * 대부분을 차지하므로, 빠뜨리면 그래프가 답하려던 질문 자체를 답하지 못합니다.
	 *
	 * 이 두 값 때문에 필터를 `inListFilter` 한 줄로 줄일 수 없습니다. 빈 문자열은 목록형
	 * 필터로 표현되지 않아 `orGroup`으로 조립해야 합니다. 줄이려다 확장이 통째로 빠집니다.
	 */
	"(not set)",
	"",
];
