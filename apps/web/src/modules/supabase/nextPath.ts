/** 로그인 화면이 로그인 뒤 돌아갈 경로를 받는 쿼리 이름입니다. */
export const LOGIN_NEXT_PARAM = "next";

/** OAuth 왕복 동안 돌아갈 경로를 들고 있는 쿠키 이름입니다. */
export const LOGIN_NEXT_COOKIE = "login_next";

/** 로그인을 시작한 뒤 돌아오기까지 기다려 주는 시간(초)입니다. */
export const LOGIN_NEXT_MAX_AGE_SEC = 60 * 10;

const SAME_ORIGIN_PROBE = "http://same-origin.invalid";

/**
 * 로그인 뒤 이동할 경로로 써도 되는 값만 돌려줍니다.
 * @description 열린 리다이렉트를 막으려고 `/`로 시작하는 같은 오리진 상대 경로만 허용합니다.
 * `//`·`/\`로 시작하면 브라우저가 다른 호스트로 읽습니다. 탭·줄바꿈은 URL 파서가 지우므로
 * `/\t/evil.com`처럼 숨긴 값도 파싱한 결과의 오리진으로 한 번 더 거릅니다.
 * @returns 허용되면 원문 그대로, 아니면 `null`
 */
export const sanitizeNextPath = (value: unknown): string | null => {
	if (typeof value !== "string") return null;
	if (!value.startsWith("/")) return null;
	if (value.startsWith("//") || value.startsWith("/\\")) return null;

	try {
		if (new URL(value, SAME_ORIGIN_PROBE).origin !== SAME_ORIGIN_PROBE) {
			return null;
		}
	} catch {
		return null;
	}

	return value;
};
