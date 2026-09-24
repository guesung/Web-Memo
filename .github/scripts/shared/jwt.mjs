/**
 * JWT 조립에 쓰는 공통 조각.
 *
 * App Store Connect(ES256)와 구글 서비스 계정(RS256)이 서명 알고리즘만 다를 뿐
 * 같은 형태로 토큰을 만듭니다. 서명 방식은 각자 갖고, 공통 조각만 여기 둡니다.
 */

/** JWT는 표준 base64가 아니라 URL 안전 변형에 패딩을 뗀 형태를 요구합니다. */
export const toBase64Url = (input) =>
	Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

/** iat·exp는 밀리초가 아니라 초입니다. 밀리초로 넣으면 만료 시각이 수만 년 뒤가 됩니다. */
export const nowInSeconds = () => Math.floor(Date.now() / 1000);
