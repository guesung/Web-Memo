export const getSafeConfig = (
	name: string,
	value: string | undefined,
): string => {
	if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
	else return value;
};

const webUrl = getSafeConfig("WEB_URL", process.env.WEB_URL);

export const CONFIG = {
	webUrl,
	// 프로토콜을 뗀 도메인(webmemo.xyz). 주소창 목업이나 안내 문구처럼 사용자에게
	// 도메인만 보여주는 자리에서 씁니다. webUrl에서 파생하므로 원천은 하나입니다.
	webHost: new URL(webUrl).host,
	// 빌드 대상 환경. tsup이 셸 BUILD_ENV를 그대로 번들에 인라인합니다.
	// 툴체인이 자동으로 넣는 NODE_ENV와 달리 staging과 production을 구분합니다.
	buildEnv: getSafeConfig("BUILD_ENV", process.env.BUILD_ENV) as
		| "development"
		| "staging"
		| "production",
};
