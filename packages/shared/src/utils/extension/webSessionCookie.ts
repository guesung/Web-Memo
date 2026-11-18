import { CONFIG } from "@web-memo/env";
import { SUPABASE } from "../../constants";

const BASE64_PREFIX = "base64-";
const CHUNK_SUFFIX_REGEX = /^\.(0|[1-9][0-9]*)$/;

const safeDecodeURIComponent = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

const decodeBase64Url = (value: string) => {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

	return new TextDecoder().decode(bytes);
};

/** 단일 쿠키(`name`) 또는 조각(`name.0`, `name.1`…)을 인덱스 순으로 이어 붙인다. */
const joinCookieValue = (cookies: chrome.cookies.Cookie[]) => {
	const single = cookies.find((cookie) => cookie.name === SUPABASE.authToken);
	if (single?.value) {
		return single.value;
	}

	const chunks = cookies
		.filter(
			(cookie) =>
				cookie.name.startsWith(SUPABASE.authToken) &&
				CHUNK_SUFFIX_REGEX.test(cookie.name.slice(SUPABASE.authToken.length)),
		)
		.map((cookie) => ({
			index: Number(cookie.name.slice(SUPABASE.authToken.length + 1)),
			value: cookie.value,
		}))
		.sort((a, b) => a.index - b.index);

	return chunks.length > 0 ? chunks.map(({ value }) => value).join("") : null;
};

/** `@supabase/ssr`가 쓴 쿠키 값(`base64-` 접두사 또는 원문 JSON)을 세션 JSON 문자열로 푼다. */
const decodeCookieValue = (value: string) => {
	const text = safeDecodeURIComponent(value);

	return text.startsWith(BASE64_PREFIX)
		? decodeBase64Url(text.slice(BASE64_PREFIX.length))
		: text;
};

/**
 * 웹 로그인 세션 쿠키에서 access token을 읽는다.
 *
 * @description 확장은 이 token만 빌려 확장 전용 세션을 발급받고 refresh token은 읽지 않는다.
 * 쿠키가 없거나 해석할 수 없거나 `expires_at`(초)이 지났으면 `null`을 돌려준다.
 */
export const getWebSessionAccessToken = async (): Promise<string | null> => {
	const cookies = await chrome.cookies.getAll({ url: CONFIG.webUrl });
	const value = joinCookieValue(cookies);
	if (!value) {
		return null;
	}

	try {
		const session: unknown = JSON.parse(decodeCookieValue(value));
		if (typeof session !== "object" || session === null) {
			return null;
		}
		const { access_token: accessToken, expires_at: expiresAt } = session as {
			access_token?: unknown;
			expires_at?: unknown;
		};
		if (typeof accessToken !== "string" || typeof expiresAt !== "number") {
			return null;
		}

		return expiresAt * 1000 > Date.now() ? accessToken : null;
	} catch {
		return null;
	}
};
