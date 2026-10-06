#!/usr/bin/env node
/**
 * 확장 zip을 Chrome 웹스토어에 올리고 게시를 제출합니다.
 * .github/workflows/cd-extension.yml 의 upload-extension 잡이 production 릴리스에서 호출합니다.
 *
 * 흐름: 리프레시 토큰으로 액세스 토큰 발급 → 업로드(필요하면 완료까지 대기) → 게시 제출.
 * 심사를 통과하면 바로 게시됩니다(DEFAULT_PUBLISH). 공개 범위는 대시보드 설정을 따릅니다.
 * 실패하면 응답 본문과 함께 exit 1입니다.
 *
 * `--check`를 주면 업로드하지 않고 자격 증명과 게시자 ID가 맞는지만 확인합니다(읽기 전용).
 *
 *   CWS_CLIENT_ID=… CWS_CLIENT_SECRET=… CWS_REFRESH_TOKEN=… \
 *     node .github/scripts/deploy/upload-extension-to-store.mjs --check
 *   … ZIP_PATH=web-memo-extension.zip node .github/scripts/deploy/upload-extension-to-store.mjs
 */

import { readFileSync } from "node:fs";

import { exchangeRefreshToken } from "../shared/google-auth.mjs";
import {
	readChromeWebStorePublisherId,
	readExtensionId,
} from "../shared/repo-versions.mjs";
import {
	fetchItemStatus,
	toItemName,
	uploadAndPublish,
} from "./chrome-web-store.mjs";

const main = async () => {
	const { CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, ZIP_PATH } =
		process.env;
	const isCheckOnly = process.argv.includes("--check");

	if (!CWS_CLIENT_ID || !CWS_CLIENT_SECRET || !CWS_REFRESH_TOKEN) {
		throw new Error(
			"CWS_CLIENT_ID·CWS_CLIENT_SECRET·CWS_REFRESH_TOKEN 환경변수가 필요합니다",
		);
	}

	if (!isCheckOnly && !ZIP_PATH) {
		throw new Error("ZIP_PATH 환경변수(업로드할 zip 경로)가 필요합니다");
	}

	const itemName = toItemName({
		publisherId: readChromeWebStorePublisherId(),
		extensionId: readExtensionId(),
	});
	const accessToken = await exchangeRefreshToken({
		clientId: CWS_CLIENT_ID,
		clientSecret: CWS_CLIENT_SECRET,
		refreshToken: CWS_REFRESH_TOKEN,
	});

	if (isCheckOnly) {
		const status = await fetchItemStatus({ accessToken, itemName });

		console.log(`자격 증명 확인 완료: ${itemName}`);
		console.log(JSON.stringify(status, null, 2));

		return;
	}

	console.log(`업로드 시작: ${ZIP_PATH} → ${itemName}`);

	const { crxVersion, publishState } = await uploadAndPublish({
		accessToken,
		itemName,
		zip: readFileSync(ZIP_PATH),
	});

	console.log(`업로드 완료: ${crxVersion} · 게시 제출 상태 ${publishState}`);
};

main().catch((error) => {
	console.error(`::error::크롬 웹스토어 업로드 실패: ${error.message}`);
	process.exit(1);
});
