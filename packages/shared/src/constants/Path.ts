export const PATHS = {
	root: "/",
	error: "/error",
	login: "/login",
	kakaoLogin: "/accounts.kakao.com",
	googleLogin: "/accounts.google.com",
	memos: "/memos",
	auth: "/auth",
	introduce: "/introduce",
	update: "/update",
	memosWish: "/memos?isWish=true",
	memosSetting: "/memos/setting",
	callbackOAuth: "/auth/callback",
	callbackEmail: "/auth/callback-email",
	admin: "/admin",
	adminUsers: "/admin/users",
};

export const NEED_AUTH_PAGES = [
	PATHS.memos,
	PATHS.memosWish,
	PATHS.memosSetting,
	PATHS.admin,
	PATHS.adminUsers,
];
