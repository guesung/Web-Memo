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
 */
export const GA4_CACHE_SECONDS = 21600;

/**
 * 지표에서 걸러낼 비운영 호스트.
 *
 * @description `activeUsers`에는 `customEvent:build_env` 필터를 걸 수 없습니다. 그
 * 파라미터는 커스텀 이벤트에만 붙는데 `activeUsers`는 gtag가 자동 수집하는 값을
 * 기반으로 하기 때문입니다. 그래서 표준 차원 `hostName`으로 거릅니다.
 *
 * 남길 호스트를 고르는 허용 목록이 아니라 지울 호스트를 적는 제외 목록인 이유는,
 * 확장 프로그램의 사이드 패널이 `chrome-extension://` 문서라 `hostName`에 호스트가
 * 잡히지 않기 때문입니다. 확장 트래픽은 `(not set)`과 빈 문자열로 들어오며, 이
 * 서비스의 주된 사용 경로라 활성 사용자의 대부분을 차지합니다. 허용 목록을 쓰면
 * 그쪽이 통째로 사라집니다.
 *
 * 대가는 이 목록이 완전하지 않다는 점입니다. 새 프리뷰 도메인이 생기면 여기에 없어
 * 운영 지표에 섞입니다. 도메인을 추가하면 이 목록도 함께 고칩니다.
 */
export const EXCLUDED_HOST_NAMES = [
	"localhost",
	"staging.webmemo.xyz",
	"staging.webmemo.site",
	"web-memo-staging.vercel.app",
];

/**
 * 제외할 Vercel 프리뷰 도메인의 공통 꼬리.
 *
 * @description 프리뷰 URL은 배포마다 해시가 바뀌어(`web-memo-<해시>-gueit214s-projects.vercel.app`)
 * 이름을 하나씩 적을 수 없습니다. 운영 별칭인 `web-memos.vercel.app`은 이 꼬리를
 * 갖지 않아 그대로 남습니다.
 */
export const EXCLUDED_HOST_NAME_SUFFIX = "-gueit214s-projects.vercel.app";
