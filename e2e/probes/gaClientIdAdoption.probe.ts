import { expect, test } from "@playwright/test";

/**
 * 프로브 전용 client_id.
 * @description layout.tsx의 스크립트는 UUID 형식만 받으므로 형식을 지킨다.
 * 실제 사용자 값과 겹치지 않도록 눈에 띄는 값을 쓴다.
 */
const PROBE_CLIENT_ID = "00000000-0000-4000-8000-00000000c1d0";

/** gtag가 GA로 이벤트를 보내는 요청. 호스트는 지역마다 달라 경로로만 가린다. */
const GA_COLLECT_PATTERN = /\/g\/collect/;

/**
 * 확장에서 넘어온 사람의 client_id를 웹 gtag가 그대로 쓰는지 운영에서 확인한다.
 * @description 확장은 `?ext_cid=`로 자기 client_id를 넘기고, 웹은 gtag보다 먼저 `_ga` 쿠키에
 * 심어 gtag가 그 값을 cid로 쓰게 한다(apps/web/src/app/layout.tsx). gtag가 쿠키 해석을
 * 바꾸면 에러 없이 새 cid가 발급되어 확장→웹 퍼널이 조용히 끊기므로 주기적으로 본다.
 * GA로 가는 요청은 모두 abort해 운영 데이터에 프로브 흔적을 남기지 않는다.
 */
test("확장 client_id가 웹 GA의 cid로 채택된다", async ({ page, context }) => {
	await context.route(GA_COLLECT_PATTERN, (route) => route.abort());

	const firstCollectRequest = page.waitForRequest(GA_COLLECT_PATTERN, {
		timeout: 30_000,
	});

	// 확장이 여는 주소와 같은 경로로 들어간다(pages/side-panel의 LoginSection).
	await page.goto(`/login?ext_cid=${PROBE_CLIENT_ID}`);

	const collectRequest = await firstCollectRequest;
	const cookies = await context.cookies();
	const gaCookie = cookies.find((cookie) => cookie.name === "_ga");

	expect(
		gaCookie?.value,
		"① layout.tsx의 스크립트가 _ga 쿠키를 심지 못했다. 우리 코드 쪽 회귀다.",
	).toBe(`GA1.1.${PROBE_CLIENT_ID}`);

	const collectedClientId = new URL(collectRequest.url()).searchParams.get(
		"cid",
	);

	expect(
		collectedClientId,
		"② _ga 쿠키는 심겼지만 gtag가 그 값을 cid로 쓰지 않았다. gtag의 쿠키 해석이 바뀌었을 수 있다.",
	).toBe(PROBE_CLIENT_ID);
});
