export const getSafeConfig = (
	name: string,
	value: string | undefined,
): string => {
	if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
	else return value;
};

export const CONFIG = {
	webUrl: getSafeConfig("WEB_URL", process.env.WEB_URL),
	nodeEnv: getSafeConfig("NODE_ENV", process.env.NODE_ENV) as
		| "development"
		| "staging"
		| "production",
	gaApiSecret: getSafeConfig("GA_API_SECRET", process.env.GA_API_SECRET),
};
