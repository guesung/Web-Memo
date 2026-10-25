/**
 * 실데이터 테스트(`*.real.test.ts`)가 만드는 행의 이름 규칙과 정리 대상 판정.
 * @description 여러 실행(로컬·CI·재실행)이 같은 테스트 계정을 동시에 쓰므로, 행마다 실행 ID를 접두어로
 * 새겨 "내 실행이 만든 것"만 지운다. 이 파일은 Vitest 단위 테스트가 직접 읽으므로 supabase-js·Playwright
 * 같은 무거운 의존성을 import하지 않는다.
 */

/** E2E가 만드는 메모 URL의 공통 뿌리. 실행 ID·테스트 ID가 이 아래 경로로 붙는다. */
export const E2E_MEMO_URL_ROOT = "https://example.com/e2e/";

/** E2E가 만드는 카테고리 이름의 공통 접두어. 실행 ID·테스트 ID가 이 뒤에 붙는다. */
export const E2E_CATEGORY_NAME_ROOT = "e2e-";

/**
 * 정리할 수 있는 메모 URL의 접두어. 지금 규칙의 뿌리와 네임스페이스 도입 전 옛 접두어다.
 * @description 옛 테스트는 `https://example.com/test-<...>` URL에 메모를 남겼다. 옛 잔여물도 24시간이 지나면 지워 전환을 마무리한다.
 */
export const E2E_MEMO_URL_PREFIXES = [
	E2E_MEMO_URL_ROOT,
	"https://example.com/test-",
];

/**
 * 네임스페이스 도입 전 사이드 패널 테스트가 메모를 남긴 URL. 접두어가 아니라 이 값과 정확히 같을 때만 옛 잔여물이다.
 * @description 테스트 계정 전용 URL이라 여기 붙은 메모는 전부 테스트 산물이다.
 */
export const LEGACY_E2E_MEMO_URLS = ["http://localhost:3000/en/memos"];

/**
 * 정리할 수 있는 카테고리 이름의 접두어. 지금 규칙의 뿌리와 네임스페이스 도입 전 옛 접두어다.
 * @description 옛 카테고리 추천 테스트는 `E2E Category <timestamp>`·`Badge Test <timestamp>`로 이름을 지었다.
 */
export const E2E_CATEGORY_NAME_PREFIXES = [
	E2E_CATEGORY_NAME_ROOT,
	"E2E Category ",
	"Badge Test ",
];

/** 크래시로 남은 다른 실행의 잔여물을 지우기까지 기다리는 시간. 그 안의 행은 아직 도는 실행의 것일 수 있다. */
export const STALE_RESIDUE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * 이번 실행의 ID를 만든다.
 * @description CI에서는 같은 워크플로 재실행끼리도 갈리도록 `<run id>-<attempt>`를 쓰고, 로컬에서는 난수를 쓴다.
 * globalSetup이 한 번만 불러 `E2E_RUN_ID`에 넣고, 워커와 globalTeardown은 {@link getRunId}로 그 값을 읽는다.
 */
export const createRunId = ({
	githubRunId,
	githubRunAttempt,
	randomSuffix,
}: IFCreateRunIdParams) => {
	if (githubRunId) {
		return `${githubRunId}-${githubRunAttempt ?? 1}`;
	}

	return `local-${randomSuffix}`;
};

/**
 * globalSetup이 정한 이번 실행의 ID를 읽는다.
 * @throws `E2E_RUN_ID`가 없으면 던진다. globalSetup을 거치지 않은 실행에서 전역 접두어로 지우는 사고를 막는다.
 */
export const getRunId = () => {
	const runId = process.env.E2E_RUN_ID;
	if (!runId) {
		throw new Error(
			"E2E_RUN_ID가 없습니다. playwright.config.ts의 globalSetup을 거쳐 실행해야 합니다.",
		);
	}

	return runId;
};

/** 이번 실행이 만든 메모 URL의 접두어. */
export const getRunMemoUrlPrefix = (runId: string) =>
	`${E2E_MEMO_URL_ROOT}${runId}/`;

/** 이번 실행이 만든 카테고리 이름의 접두어. 실행 ID 뒤에 `-`를 붙여 `12-1`이 `12-10`을 삼키지 않게 한다. */
export const getRunCategoryNamePrefix = (runId: string) =>
	`${E2E_CATEGORY_NAME_ROOT}${runId}-`;

/**
 * 테스트 하나가 쓸 메모 URL·카테고리 이름을 만든다.
 * @description 테스트 ID는 Playwright의 `testInfo.testId`(`<파일 해시>-<테스트 해시>`)에서 테스트 해시 앞부분만 쓴다.
 * 파일 해시는 같은 파일의 테스트끼리 같아서 구분에 쓸모가 없다.
 */
export const createTestNamespace = ({
	runId,
	testId,
}: IFCreateTestNamespaceParams) => {
	const shortTestId = (testId.split("-").at(-1) ?? testId).slice(0, 10);

	return {
		/** 이 테스트 전용 메모 URL. `https://example.com/e2e/<runId>/<testId>/<slug>` 꼴이다. */
		memoUrl: (slug: string) =>
			`${getRunMemoUrlPrefix(runId)}${shortTestId}/${slug}`,
		/** 이 테스트 전용 카테고리 이름. `e2e-<runId>-<testId> <name>` 꼴이다. */
		categoryName: (name: string) =>
			`${getRunCategoryNamePrefix(runId)}${shortTestId} ${name}`,
	};
};

/**
 * 메모 URL 또는 카테고리 이름이 정리 대상인지 판정한다.
 * @description 이번 실행의 접두어면 시각과 무관하게 지운다. 다른 실행의 E2E 접두어(옛 접두어 포함)면 만든 지
 * 24시간이 지난 것만 지운다. 그보다 새 행은 동시에 도는 다른 실행의 것일 수 있다. E2E 접두어가 없으면 절대 지우지 않는다.
 */
export const isCleanupTarget = ({
	value,
	createdAt,
	runId,
	now,
}: IFIsCleanupTargetParams) => {
	const isOwnRunValue =
		value.startsWith(getRunMemoUrlPrefix(runId)) ||
		value.startsWith(getRunCategoryNamePrefix(runId));
	if (isOwnRunValue) {
		return true;
	}

	const isE2EValue =
		[...E2E_MEMO_URL_PREFIXES, ...E2E_CATEGORY_NAME_PREFIXES].some((prefix) =>
			value.startsWith(prefix),
		) || LEGACY_E2E_MEMO_URLS.includes(value);
	if (!isE2EValue || createdAt === null) {
		return false;
	}

	return now.getTime() - new Date(createdAt).getTime() > STALE_RESIDUE_AGE_MS;
};

/** {@link createRunId}의 인자. */
interface IFCreateRunIdParams {
	/** `GITHUB_RUN_ID`. 로컬에서는 없다 */
	githubRunId: string | undefined;
	/** `GITHUB_RUN_ATTEMPT`. 없으면 1로 본다 */
	githubRunAttempt: string | undefined;
	/** 로컬 실행 ID에 붙일 난수 */
	randomSuffix: string;
}

/** {@link createTestNamespace}의 인자. */
interface IFCreateTestNamespaceParams {
	/** 이번 실행의 ID ({@link getRunId}) */
	runId: string;
	/** Playwright의 `testInfo.testId` */
	testId: string;
}

/** {@link isCleanupTarget}의 인자. */
interface IFIsCleanupTargetParams {
	/** 메모 URL 또는 카테고리 이름 */
	value: string;
	/** 행이 만들어진 시각(ISO). 메모는 null일 수 있다 */
	createdAt: string | null;
	/** 이번 실행의 ID */
	runId: string;
	/** 판정 기준 시각 */
	now: Date;
}
