/**
 * 각 배포 채널에 "지금 올라가 있는" 버전을 조회합니다.
 *
 * 네 채널의 인증 방식이 전부 다릅니다.
 *   - App Store Connect : .p8 키로 서명한 ES256 JWT
 *   - Google Play       : 서비스 계정으로 서명한 RS256 JWT → OAuth 토큰 교환
 *   - Chrome 웹 스토어   : refresh token → OAuth 토큰 교환 (초안), 공개 CRX 매니페스트 (게시본)
 *   - 웹                : 배포된 앱이 스스로 알려주는 /api/version
 *
 * 채널 하나가 죽어도 나머지 알림은 나가야 하므로, 각 조회는 개별적으로 실패를
 * 삼키고 { error } 를 돌려줍니다. 호출부는 값이 없을 수 있다고 가정해야 합니다.
 */

import { createSign, sign as signBuffer } from "node:crypto";

import {
	readAppConfig,
	readAscIdentifiers,
	readExtensionId,
	readWebUrl,
} from "./repo-versions.mjs";

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

/**
 * App Store Connect가 요구하는 ES256 JWT.
 *
 * Node의 기본 서명 출력은 DER이고 JWT는 r||s(P1363)를 요구합니다.
 * dsaEncoding을 빼먹으면 401이 떨어지며 원인이 드러나지 않습니다.
 */
const createAscToken = ({ keyId, issuerId, privateKey }) => {
	const issuedAt = nowInSeconds();
	const signingInput = [
		toBase64Url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })),
		toBase64Url(
			JSON.stringify({
				iss: issuerId,
				iat: issuedAt,
				exp: issuedAt + 900,
				aud: "appstoreconnect-v1",
			}),
		),
	].join(".");

	const signature = signBuffer("sha256", Buffer.from(signingInput), {
		key: privateKey,
		dsaEncoding: "ieee-p1363",
	});

	return `${signingInput}.${toBase64Url(signature)}`;
};

/** 서비스 계정 JSON으로 RS256 JWT를 만들어 OAuth 액세스 토큰과 교환합니다. */
const exchangeServiceAccountToken = async ({ serviceAccount, scope }) => {
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
 * iOS: App Store에 판매 중인 버전과 TestFlight에 올라간 최신 빌드.
 *
 * eas submit은 TestFlight까지만 올리므로, 배포 직후 움직이는 값은 TestFlight 쪽입니다.
 * App Store 버전은 심사를 통과한 뒤에야 바뀝니다. 둘을 함께 보여줍니다.
 */
export const fetchIosVersions = async ({ ascPrivateKey }) => {
	const { keyId, issuerId, appId } = readAscIdentifiers();
	const token = createAscToken({ keyId, issuerId, privateKey: ascPrivateKey });
	const headers = { authorization: `Bearer ${token}` };

	const versions = await requestJson(
		`https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?limit=10`,
		{ headers },
	);
	const live =
		versions.data.find(
			(version) => version.attributes.appStoreState === "READY_FOR_SALE",
		) ?? versions.data[0];

	const builds = await requestJson(
		`https://api.appstoreconnect.apple.com/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=1&include=preReleaseVersion`,
		{ headers },
	);
	const latestBuild = builds.data[0];
	const preReleaseVersion = builds.included?.find(
		(item) => item.type === "preReleaseVersions",
	);

	return {
		appStore: live
			? {
					version: live.attributes.versionString,
					state: live.attributes.appStoreState,
				}
			: null,
		testFlight: latestBuild
			? {
					version: preReleaseVersion?.attributes.version ?? "?",
					build: latestBuild.attributes.version,
					state: latestBuild.attributes.processingState,
				}
			: null,
	};
};

/**
 * Android: 트랙별 최신 릴리스.
 *
 * Play Developer API는 읽기조차 edit 세션을 요구합니다. 만들고 읽고 버립니다
 * (변경을 commit하지 않으므로 스토어에는 아무 영향이 없습니다).
 */
export const fetchAndroidVersions = async ({ serviceAccountJson }) => {
	const { androidPackage } = readAppConfig();
	const accessToken = await exchangeServiceAccountToken({
		serviceAccount: JSON.parse(serviceAccountJson),
		scope: "https://www.googleapis.com/auth/androidpublisher",
	});
	const headers = { authorization: `Bearer ${accessToken}` };
	const editsUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${androidPackage}/edits`;

	const edit = await requestJson(editsUrl, { method: "POST", headers });

	try {
		const { tracks } = await requestJson(`${editsUrl}/${edit.id}/tracks`, {
			headers,
		});

		return tracks
			.map((track) => {
				const release = track.releases?.find(
					(candidate) => candidate.status === "completed",
				);

				if (!release) return null;

				return {
					track: track.track,
					version: release.name,
					versionCode: release.versionCodes?.at(-1) ?? null,
				};
			})
			.filter(Boolean);
	} finally {
		await fetch(`${editsUrl}/${edit.id}`, { method: "DELETE", headers });
	}
};

/**
 * 확장: 게시된 버전과 업로드된 초안 버전.
 *
 * cd-extension.yml은 publish: false로 올리므로 둘이 거의 항상 다릅니다.
 * "업로드는 됐는데 게시 버튼을 안 눌렀다"를 구분하는 게 이 조회의 핵심입니다.
 * 게시된 버전은 CWS API가 알려주지 않아, 크롬이 실제로 쓰는 업데이트 매니페스트에서 읽습니다.
 */
export const fetchExtensionVersions = async ({
	clientId,
	clientSecret,
	refreshToken,
}) => {
	const extensionId = readExtensionId();

	const published = await fetch(
		`https://clients2.google.com/service/update2/crx?response=updatecheck&prodversion=9999.0.0.0&acceptformat=crx3&x=${encodeURIComponent(`id=${extensionId}&uc`)}`,
	)
		.then((response) => response.text())
		// 응답 첫 줄이 <?xml version="1.0"?> 이라 version= 만 찾으면 그걸 물어옵니다.
		// 반드시 <updatecheck> 엘리먼트 안에서 찾아야 합니다.
		.then(
			(xml) =>
				xml.match(/<updatecheck[^>]*\sversion=["']([\d.]+)["']/)?.[1] ?? null,
		);

	// 게시본은 인증이 필요 없습니다. 토큰이 없으면 초안만 포기하고 게시본은 그대로 돌려줍니다.
	if (!refreshToken) {
		return { published, draft: { skipped: true } };
	}

	const { access_token } = await requestJson(
		"https://oauth2.googleapis.com/token",
		{
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: refreshToken,
				grant_type: "refresh_token",
			}),
		},
	);

	const item = await requestJson(
		`https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}?projection=DRAFT`,
		{
			headers: {
				authorization: `Bearer ${access_token}`,
				"x-goog-api-version": "2",
			},
		},
	);

	return {
		published,
		draft: { version: item.crxVersion ?? null, uploadState: item.uploadState },
	};
};

/**
 * 웹: 배포된 인스턴스가 /api/version으로 스스로 밝히는 커밋.
 *
 * 웹은 버전 번호가 없습니다(docs/versioning.md). Vercel API로 배포를 역추적하는 대신
 * 실제로 응답하는 인스턴스에게 물어봅니다 — 별칭·롤백 어느 쪽이든 진실이 하나입니다.
 */
export const fetchWebVersion = async ({ webUrl }) => {
	const version = await requestJson(new URL("/api/version", webUrl));

	return { commit: version.commit, builtAt: version.builtAt };
};

/**
 * 네 채널을 병렬로 조회합니다. 실패한 채널은 { error } 로만 남고 나머지는 그대로 옵니다.
 * 자격 증명이 아예 없는 채널은 조용히 건너뜁니다(로컬 실행에서 흔합니다).
 */
export const fetchStoreVersions = async (env = process.env) => {
	const lookups = {
		ios: env.ASC_API_KEY_P8
			? () => fetchIosVersions({ ascPrivateKey: env.ASC_API_KEY_P8 })
			: null,
		android: env.PLAY_SERVICE_ACCOUNT_JSON
			? () =>
					fetchAndroidVersions({
						serviceAccountJson: env.PLAY_SERVICE_ACCOUNT_JSON,
					})
			: null,
		// 게시된 버전은 공개 매니페스트로 읽으므로 토큰 없이도 절반은 조회됩니다.
		extension: () =>
			fetchExtensionVersions({
				clientId: env.CWS_CLIENT_ID,
				clientSecret: env.CWS_CLIENT_SECRET,
				refreshToken: env.CWS_REFRESH_TOKEN,
			}),
		// 웹만은 자격 증명이 필요 없습니다. 주소는 레포가 갖고 있습니다.
		web: () => fetchWebVersion({ webUrl: readWebUrl() }),
	};

	const settled = await Promise.all(
		Object.entries(lookups).map(async ([channel, lookup]) => {
			if (!lookup) return [channel, { skipped: true }];

			try {
				return [channel, await lookup()];
			} catch (error) {
				console.error(`[${channel}] 스토어 버전 조회 실패: ${error.message}`);

				return [channel, { error: error.message }];
			}
		}),
	);

	return Object.fromEntries(settled);
};
