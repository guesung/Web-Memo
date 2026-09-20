export const ANALYTICS = {
	gaId: "G-6HHNP7KJM5",
	gtmId: "GTM-WSDF6FQ2",
	gaApiSecret: "Qa4V0t6SSzC8jMNpTkrqxw",
} as const;

/**
 * 만든 사람 본인의 user_id. 이 사람의 행동은 GA로 보내지 않는다.
 * @description 사용자가 적은 지금은 본인의 사용이 섞이면 지표가 통째로 흔들린다.
 *
 * 판정 기준을 `profiles.role === "admin"`으로 두지 않은 이유: 확장은 role을 모른다.
 * role을 읽는 코드는 `checkIsAdmin` 하나이고 그 호출부는 웹 서버 컴포넌트뿐이며,
 * 생성된 `profiles` 타입에는 role 컬럼조차 없다. 확장에서 조회하려면 RLS 정책부터
 * 확인해야 하는데 그 정책도 레포에 없다.
 *
 * 공개 레포에 UUID가 드러나지만, 어차피 클라이언트 번들에 실려야 판정할 수 있는 값이고
 * UUID 자체는 RLS 아래에서 아무 권한도 주지 않는다.
 */
export const ANALYTICS_EXCLUDED_USER_ID =
	"ef8c4ab1-4d92-4b0f-9d41-084f51813406";

/**
 * 다음 방문 때 gtag가 뜨기 전에 읽는 표식.
 * @description 로그인 여부는 세션을 복원한 뒤에야 알 수 있는데, 그때는 gtag가 이미
 * page_view를 보낸 뒤다. 한 번 관리자로 확인되면 이 표식을 남겨 두고, 다음 방문부터는
 * 레이아웃의 선행 스크립트가 gtag보다 먼저 전역 플래그를 켠다.
 *
 * `"use client"` 파일에 두면 서버 컴포넌트(레이아웃)에서는 값이 아닌 클라이언트 참조
 * 함수가 되어 선행 스크립트의 문자열에 함수 본문이 박히므로, 서버에서도 안전한 이 파일에 둔다.
 */
export const ANALYTICS_EXCLUDED_STORAGE_KEY = "analyticsExcluded";
