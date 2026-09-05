import { cleanupE2EResidue } from "./tests/lib/cleanup";

/**
 * 모든 worker가 끝난 뒤 테스트 계정에 남은 E2E 데이터를 지운다.
 * @description 통합 테스트는 모킹 없이 실제 Supabase를 치므로, 정리하지 않으면
 * 실행할 때마다 메모·카테고리가 쌓인다.
 */
const globalTeardown = async () => {
	await cleanupE2EResidue();
};

export default globalTeardown;
