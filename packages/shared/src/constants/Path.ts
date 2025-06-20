export const PATHS = {
	root: "/",
	error: "/error",
	login: "/login",
	memos: "/memos",
	auth: "/auth",
	introduce: "/introduce",
	update: "/update",
	memosWish: "/memos?isWish=true",
	memosSetting: "/memos/setting",
	callbackOAuth: "/auth/callback",
	callbackEmail: "/auth/callback-email",
};

export const NEED_AUTH_PAGES = [PATHS.memos, PATHS.memosSetting];
