import { cleanupE2EResidue } from "./tests/lib/cleanup";
import { getRunId } from "./tests/lib/namespace";

/**
 * 모든 worker가 끝난 뒤 이번 실행이 남긴 E2E 데이터와 24시간 지난 E2E 잔여물을 지운다.
 * @description 통합 테스트는 모킹 없이 실제 Supabase를 치므로, 정리하지 않으면 실행할 때마다
 * 메모·카테고리가 쌓인다. 다른 실행이 아직 쓰는 행은 건드리지 않는다. 삭제에 실패하면 던져서
 * 실행 실패로 드러낸다.
 */
const globalTeardown = async () => {
	await cleanupE2EResidue({ runId: getRunId(), now: new Date() });
};

export default globalTeardown;
