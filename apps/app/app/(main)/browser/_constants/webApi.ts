/**
 * 웹 API를 호출할 때 쓰는 base URL.
 * @description
 * Expo는 `EXPO_PUBLIC_` 접두사가 붙은 환경변수만 번들에 인라인하므로,
 * 이 앱은 `@web-memo/env`의 `CONFIG.webUrl`(환경별로 갈리는 값)을 읽을 수 없다.
 * 그래서 프로덕션 주소를 여기 고정해 둔다. 개발 중에도 프로덕션 API를 호출하게 되므로,
 * 환경별 분기가 필요해지면 `EXPO_PUBLIC_WEB_URL` 도입이 먼저다.
 */
export const WEB_API_ORIGIN = "https://www.webmemo.xyz";
