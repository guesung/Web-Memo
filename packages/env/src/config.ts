export const getSafeConfig = (
	name: string,
	value: string | undefined,
): string => {
	if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
	else return value;
};

export const getOptionalConfig = (
	value: string | undefined,
	defaultValue = "",
): string => {
	return value ?? defaultValue;
};

export const CONFIG = {
	webUrl: getSafeConfig("WEB_URL", process.env.WEB_URL),
	supabaseUrl: getSafeConfig("SUPABASE_URL", process.env.SUPABASE_URL),
	supabaseAnonKey: getSafeConfig(
		"SUPABASE_ANON_KEY",
		process.env.SUPABASE_ANON_KEY,
	),
	sentryDsnExtension: getSafeConfig("SENTRY_DSN", process.env.SENTRY_DSN),
	sentryDsnWeb: getSafeConfig("SENTRY_DSN_WEB", process.env.SENTRY_DSN_WEB),
	sentryAuthToken: getSafeConfig(
		"SENTRY_AUTH_TOKEN",
		process.env.SENTRY_AUTH_TOKEN,
	),
	nodeEnv: getSafeConfig("NODE_ENV", process.env.NODE_ENV) as
		| "development"
		| "staging"
		| "production",
	youtubeTranscriptUrl: getSafeConfig(
		"YOUTUBE_TRANSCRIPT_URL",
		process.env.YOUTUBE_TRANSCRIPT_URL,
	),
	gaId: getSafeConfig("GA_ID", process.env.GA_ID),
	gtmId: getSafeConfig("GTM_ID", process.env.GTM_ID),
	gaApiSecret: getSafeConfig("GA_API_SECRET", process.env.GA_API_SECRET),
	isFirefox: process.env.__FIREFOX__ === "true",
	extensionKey: getOptionalConfig(process.env.EXTENSION_KEY),
	oauth2ClientId: getOptionalConfig(process.env.OAUTH2_CLIENT_ID),
};
