/**
 * E2E가 Supabase 목을 건 브라우저 컨텍스트에 심는 쿠키 이름.
 *
 * @description 목은 브라우저 요청만 가로채므로, 서버에서 실제 Supabase를 조회해 넘기는 prefetch가 있으면
 * 화면에 목 대신 테스트 계정의 실제 데이터가 그려진다. 서버는 이 쿠키가 있으면 prefetch를 건너뛰고
 * 브라우저가 직접 조회하게 둔다. 실제 데이터를 쓰는 테스트(`*.real.test.ts`)는 쿠키가 없어 prefetch를 그대로 탄다.
 */
export const E2E_MOCK_SUPABASE_COOKIE = "web-memo-e2e-mock-supabase";
