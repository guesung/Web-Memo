export const getSafeConfig = (
	name: string,
	value: string | undefined,
): string => {
	if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
	else return value;
};

export const CONFIG = {
	webUrl: getSafeConfig("WEB_URL", process.env.WEB_URL),
	supabaseUrl: getSafeConfig("SUPABASE_URL", process.env.SUPABASE_URL),
	supabaseAnonKey: getSafeConfig(
		"SUPABASE_ANON_KEY",
		process.env.SUPABASE_ANON_KEY,
	),
	sentryDsn: getSafeConfig("SENTRY_DSN", process.env.SENTRY_DSN),
	sentryDsnWeb: getSafeConfig("SENTRY_DSN_WEB", process.env.SENTRY_DSN_WEB),
	sentryAuthToken: getSafeConfig(
		"SENTRY_AUTH_TOKEN",
		process.env.SENTRY_AUTH_TOKEN,
	),
	nodeEnv: getSafeConfig("NODE_ENV", process.env.NODE_ENV) as
		| "development"
		| "production",
	makeWebhookNotionApi: getSafeConfig(
		"MAKE_WEBHOOK_NOTION_API",
		process.env.MAKE_WEBHOOK_NOTION_API,
	) as "development" | "production",
	openApiKey: getSafeConfig("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
};
