import type { BrowserContext } from "@playwright/test";

/**
 * 모든 테스트 컨텍스트에서 채널톡 SDK 요청을 막는 auto fixture 본체.
 * @description 실제 SDK를 불러오다 boot가 실패하면 웹이 오류 토스트를 띄운다. Radix 토스트는 대화상자와
 * 같은 DismissableLayer 스택에 올라가 Escape를 가장 늦게 뜬 레이어만 처리하므로, 토스트가 대화상자보다
 * 늦게 뜨면 Escape가 토스트만 닫고 대화상자가 남아 테스트가 흔들린다. 토스트 시점이 외부 스크립트 로드에
 * 달려 있으므로 요청을 abort해 boot 콜백 자체가 불리지 않게 한다. 채널톡은 어떤 E2E도 검증하지 않아
 * `*.real.test.ts`에도 건다. web·extension fixture가 `[channelTalkGuardFixture, { auto: true }]`로 등록한다.
 */
export const channelTalkGuardFixture = async (
	{ context }: { context: BrowserContext },
	use: (value: undefined) => Promise<void>,
) => {
	await context.route("https://cdn.channel.io/**", (route) => route.abort());
	await use(undefined);
};
