/**
 * Google 서비스 계정으로 OAuth 액세스 토큰을 얻습니다.
 *
 * Play Developer API(스토어 버전 조회)와 GA4 Data API(데일리 리포트)가 같은
 * 방식으로 인증하므로 여기 한 곳에 둡니다. scope만 달라집니다.
 */

import { createSign } from "node:crypto";

const toBase64Url = (input) =>
	Buffer.from(input)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

const nowInSeconds = () => Math.floor(Date.now() / 1000);

/** 응답이 2xx가 아니면 본문까지 담아 던집니다. 빈 에러 메시지는 디버깅이 불가능합니다. */
const requestJson = async (url, options = {}) => {
	const response = await fetch(url, options);

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`${response.status} ${url} — ${body.slice(0, 300)}`);
	}

	return await response.json();
};

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
