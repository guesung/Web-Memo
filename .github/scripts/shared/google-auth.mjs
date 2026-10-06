/**
 * Google 서비스 계정으로 OAuth 액세스 토큰을 얻습니다.
 *
 * Play Developer API(스토어 버전 조회)와 GA4 Data API(데일리 리포트)가 같은
 * 방식으로 인증하므로 여기 한 곳에 둡니다. scope만 달라집니다.
 */

import { createSign } from "node:crypto";

import { requestJson } from "./http.mjs";
import { nowInSeconds, toBase64Url } from "./jwt.mjs";

/** 서비스 계정 JSON으로 RS256 JWT를 만들어 OAuth 액세스 토큰과 교환합니다. */
export const exchangeServiceAccountToken = async ({
	serviceAccount,
	scope,
}) => {
	const issuedAt = nowInSeconds();
	const signingInput = [
		toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
		toBase64Url(
			JSON.stringify({
				iss: serviceAccount.client_email,
				scope,
				aud: "https://oauth2.googleapis.com/token",
				iat: issuedAt,
				exp: issuedAt + 900,
			}),
		),
	].join(".");

	const signer = createSign("RSA-SHA256");
	signer.update(signingInput);
	const assertion = `${signingInput}.${toBase64Url(signer.sign(serviceAccount.private_key))}`;

	const token = await requestJson("https://oauth2.googleapis.com/token", {
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
 * OAuth 리프레시 토큰으로 액세스 토큰을 얻습니다.
 *
 * Chrome 웹스토어 API(확장 업로드·스토어 버전 조회)가 서비스 계정이 아니라 이 방식으로
 * 인증합니다. 액세스 토큰은 1시간 유효하므로 스크립트 한 번에 하나만 받아 씁니다.
 */
export const exchangeRefreshToken = async ({
	clientId,
	clientSecret,
	refreshToken,
}) => {
	const token = await requestJson("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});

	return token.access_token;
};
