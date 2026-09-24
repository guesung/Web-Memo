import { randomUUID } from "node:crypto";
import { createRunId } from "./tests/lib/namespace";

/**
 * 이번 실행의 ID를 한 번 정해 `E2E_RUN_ID`에 넣는다.
 * @description 워커 프로세스와 globalTeardown이 같은 ID를 봐야 실데이터 테스트가 쓴 행과 정리 대상이 맞는다.
 * Playwright는 globalSetup에서 바꾼 process.env를 워커에 넘긴다. 이미 값이 있으면(수동 지정) 그대로 둔다.
 */
const globalSetup = () => {
	if (process.env.E2E_RUN_ID) {
		return;
	}

	process.env.E2E_RUN_ID = createRunId({
		githubRunId: process.env.GITHUB_RUN_ID,
		githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT,
		randomSuffix: randomUUID().slice(0, 8),
	});
};

export default globalSetup;
