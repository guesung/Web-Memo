import { CHROME_EXTENSION_AUTH_REDIRECT_URL } from "@web-memo/shared/constants";

/** 로그인을 마친 뒤 어디로 돌아갈지 알리는 쿼리 이름입니다. */
export const LOGIN_RETURN_PARAM = "return";

/** 확장의 로그인 창에서 시작한 로그인임을 뜻하는 값입니다. */
export const LOGIN_RETURN_EXTENSION = "extension";

/** OAuth 왕복 동안 "확장으로 돌아간다"를 들고 있는 쿠키 이름입니다. */
export const LOGIN_RETURN_COOKIE = "login_return";

/** 로그인을 시작한 뒤 돌아오기까지 기다려 주는 시간(초)입니다. */
export const LOGIN_RETURN_MAX_AGE_SEC = 60 * 10;

/**
 * 확장의 로그인 창을 닫게 하는 주소를 만듭니다.
 * @description 주소는 고정된 확장 ID로만 만들어 다른 곳으로는 보내지 않습니다. 로그인 창은 웹
 * 페이지를 보여줄 곳이 아니므로 성공이든 실패든 이 주소로 끝내고, 결과는 쿼리로만 알립니다.
 * 토큰은 싣지 않습니다. 세션은 이미 웹 쿠키에 있고 확장이 그 쿠키를 읽습니다.
 */
export const buildExtensionReturnUrl = (
	result: { login: string; isSignUp: boolean } | { error: true },
): URL => {
	const url = new URL(CHROME_EXTENSION_AUTH_REDIRECT_URL);

	if ("error" in result) {
		url.searchParams.set("error", "1");
		return url;
	}

	url.searchParams.set("login", result.login);
	if (result.isSignUp) url.searchParams.set("signup", "true");

	return url;
};
