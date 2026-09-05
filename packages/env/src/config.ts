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
	// 사람에게 보여주는 도메인(webmemo.xyz). 주소창 목업이나 안내 문구처럼 도메인만
	// 노출하는 자리에서 씁니다. webUrl에서 파생하므로 원천은 여전히 하나입니다.
	//
	// www를 떼는 이유는 실제 서빙 호스트(www.webmemo.xyz)와 브랜드로 읽히는 이름이
	// 다르기 때문입니다. origin이 일치해야 하는 값에는 webUrl을 그대로 쓰세요 —
	// 확장 매니페스트의 externally_connectable처럼 www가 빠지면 조용히 죽는 자리가 있습니다.
	webDisplayHost: new URL(webUrl).host.replace(/^www\./, ""),
	// 빌드 대상 환경. tsup이 셸 BUILD_ENV를 그대로 번들에 인라인합니다.
	// 툴체인이 자동으로 넣는 NODE_ENV와 달리 staging과 production을 구분합니다.
	buildEnv: getSafeConfig("BUILD_ENV", process.env.BUILD_ENV) as
		| "development"
		| "staging"
		| "production",
};
