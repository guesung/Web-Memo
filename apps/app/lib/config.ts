function getSafeConfig(name: string, value: string | undefined): string {
	if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
	return value;
}

export const CONFIG = {
	supabaseUrl: getSafeConfig(
		"EXPO_PUBLIC_SUPABASE_URL",
		process.env.EXPO_PUBLIC_SUPABASE_URL,
	),
	supabaseAnonKey: getSafeConfig(
		"EXPO_PUBLIC_SUPABASE_ANON_KEY",
		process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
	),
	webappUrl: getSafeConfig(
		"EXPO_PUBLIC_WEBAPP_URL",
		process.env.EXPO_PUBLIC_WEBAPP_URL,
	),
	googleWebClientId: getSafeConfig(
		"EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
		process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
	),
	googleAppClientId: getSafeConfig(
		"EXPO_PUBLIC_GOOGLE_APP_CLIENT_ID",
		process.env.EXPO_PUBLIC_GOOGLE_APP_CLIENT_ID,
	),
};
