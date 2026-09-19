/**
 * Google 서비스 계정으로 OAuth 액세스 토큰을 얻습니다.
 *
 * @description `.github/scripts/lib/google-auth.mjs`를 TypeScript로 옮긴 것입니다.
 * `google-auth-library` 같은 패키지를 들이지 않고 `node:crypto`와 `fetch`만 씁니다.
 * RS256 서명에 `node:crypto`가 필요하므로 이 코드를 부르는 라우트는 Node 런타임이어야 합니다.
 */

import { createSign } from "node:crypto";

import { requestJson } from "./requestJson";

/** JWT의 aud이자 토큰을 받아오는 곳입니다. 두 값이 일치해야 구글이 받아들입니다. */
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** JWT는 표준 base64가 아니라 URL 안전 변형에 패딩을 뗀 형태를 요구합니다. */
const toBase64Url = (input: string | Buffer) =>
	Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

/** iat·exp는 밀리초가 아니라 초입니다. 밀리초로 넣으면 만료 시각이 수만 년 뒤가 됩니다. */
const nowInSeconds = () => Math.floor(Date.now() / 1000);

/** 서비스 계정 JSON으로 RS256 JWT를 만들어 OAuth 액세스 토큰과 교환합니다. */
export const exchangeServiceAccountToken = async ({
	serviceAccount,
	scope,
}: {
	serviceAccount: IFServiceAccount;
	scope: string;
}): Promise<string> => {
	const issuedAt = nowInSeconds();
	const signingInput = [
		toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
		toBase64Url(
			JSON.stringify({
				iss: serviceAccount.client_email,
				scope,
				aud: TOKEN_ENDPOINT,
				iat: issuedAt,
				exp: issuedAt + 900,
			}),
		),
	].join(".");

	const signer = createSign("RSA-SHA256");
	signer.update(signingInput);
	const assertion = `${signingInput}.${toBase64Url(signer.sign(serviceAccount.private_key))}`;

	const token = await requestJson<IFTokenResponse>(TOKEN_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion,
		}),
	});

	return token.access_token;
};

/**
 * 서비스 계정 키 JSON에서 서명에 쓰는 필드.
 *
 * @description 필드 이름이 snake_case인 것은 구글이 내려주는 형태를 그대로 받기
 * 때문입니다. 레포의 camelCase 규칙이 적용되지 않는 자리입니다.
 */
interface IFServiceAccount {
	/** 서비스 계정 이메일. JWT의 iss가 됩니다 */
	client_email: string;
	/** PEM 형식 RSA 개인키 */
	private_key: string;
}

/** 토큰 교환 응답 중 실제로 읽는 부분. */
interface IFTokenResponse {
	/** 이후 API 호출의 Bearer 토큰 */
	access_token: string;
}
