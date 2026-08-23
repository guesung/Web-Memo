export const getSafeConfig = (
	name: string,
	value: string | undefined,
): string => {
	if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
	else return value;
};

export const CONFIG = {
	webUrl: getSafeConfig("WEB_URL", process.env.WEB_URL),
	// 빌드 대상 환경. tsup이 셸 BUILD_ENV를 그대로 번들에 인라인합니다.
	// 툴체인이 자동으로 넣는 NODE_ENV와 달리 staging과 production을 구분합니다.
	buildEnv: getSafeConfig("BUILD_ENV", process.env.BUILD_ENV) as
		| "development"
		| "staging"
		| "production",
};
