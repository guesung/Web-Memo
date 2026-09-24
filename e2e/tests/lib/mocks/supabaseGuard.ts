import type { BrowserContext, TestInfo } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";

/**
 * 실제 Supabase를 쳐도 되는 테스트 파일인지 판정한다.
 * @description `*.real.test.ts`는 실DB를 읽고 쓰려고 만든 테스트이고, `*.setup.ts`는 로그인
 * 세션만 만드는 setup 프로젝트다. 둘은 목 가드를 걸지 않는다.
 */
export const isRealDataTestFile = (filePath: string) =>
	filePath.endsWith(".real.test.ts") || filePath.endsWith(".setup.ts");

/**
 * 목이 처리하지 않은 Supabase 요청을 막고 기록하는 라우트를 컨텍스트에 건다.
 * @description 테스트 본문보다 먼저 등록해야 한다. Playwright는 나중에 등록한 라우트를 먼저 보므로
 * `setupSupabaseMocks`의 핸들러가 이 가드보다 앞서고, 핸들러가 처리하지 못해 `fallback`한 요청과
 * 핸들러가 아예 없는 경로의 요청만 여기로 떨어진다. 로그인은 실제로 돌아야 하므로 `/auth/v1`은 통과시킨다.
 * 컨텍스트 단위로 거는 이유는 사이드 패널·옵션처럼 테스트가 직접 만들지 않은 확장 페이지의 요청도 잡기 위해서다.
 * @returns 막은 요청 목록. 원소는 `METHOD path?query` 꼴이다(예: `PATCH /rest/v1/memo?id=in.(1,2)&select=*`).
 */
export const guardUnhandledSupabaseRequests = async (
	context: BrowserContext,
) => {
	const unhandledRequests: string[] = [];

	await context.route(`${SUPABASE.url}/**`, async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname.startsWith("/auth/v1")) {
			await route.fallback();
			return;
		}

		unhandledRequests.push(
			`${route.request().method()} ${decodeRequestPath(url)}`,
		);
		await route.abort();
	});

	return unhandledRequests;
};

/**
 * 테스트마다 목 가드를 걸고, 막힌 요청이 있으면 테스트를 실패시키는 auto fixture 본체.
 * @description web·extension fixture가 `[supabaseGuardFixture, { auto: true }]`로 등록한다. auto fixture는
 * beforeEach보다 먼저 준비되므로 가드가 항상 목 핸들러보다 먼저 등록된다. 실데이터 테스트 파일은 건너뛴다.
 * @throws 목이 없는 Supabase 요청이 한 건이라도 있었으면 `목 없는 요청: METHOD path?query` 목록으로 던진다.
 */
export const supabaseGuardFixture = async (
	{ context }: { context: BrowserContext },
	use: (value: undefined) => Promise<void>,
	testInfo: TestInfo,
) => {
	if (isRealDataTestFile(testInfo.file)) {
		await use(undefined);
		return;
	}

	const unhandledRequests = await guardUnhandledSupabaseRequests(context);
	await use(undefined);

	if (unhandledRequests.length > 0) {
		throw new Error(
			`목 없는 요청: ${unhandledRequests.length}건\n${unhandledRequests.map((request) => `  ${request}`).join("\n")}`,
		);
	}
};

/** 실패 메시지에서 필터를 그대로 읽을 수 있게 경로와 쿼리를 디코드한다. 디코드할 수 없으면 원문을 쓴다. */
const decodeRequestPath = (url: URL) => {
	const requestPath = `${url.pathname}${url.search}`;

	try {
		return decodeURIComponent(requestPath);
	} catch {
		return requestPath;
	}
};
