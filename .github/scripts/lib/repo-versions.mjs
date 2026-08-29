/**
 * 레포지토리에 커밋되어 있는 "빌드된 버전"들을 읽습니다.
 *
 * 버전 트랙이 왜 셋으로 나뉘어 있는지는 docs/versioning.md를 참고하세요.
 * 여기서는 그 문서가 정한 단일 진실 원천만 읽고, 값을 새로 만들지 않습니다.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const readJson = (relativePath) =>
	JSON.parse(readFileSync(join(REPO_ROOT, relativePath), "utf8"));

/** apps/app/app.json — App Store 마케팅 버전(빌드 번호는 EAS 서버가 소유). */
export const readAppConfig = () => {
	const appJson = readJson("apps/app/app.json");

	return {
		version: appJson.expo.version,
		iosBundleId: appJson.expo.ios.bundleIdentifier,
		androidPackage: appJson.expo.android.package,
	};
};

/** apps/app/eas.json — App Store Connect API 자격 증명 중 비밀이 아닌 식별자들. */
export const readAscIdentifiers = () => {
	const ios = readJson("apps/app/eas.json").submit.production.ios;

	return {
		keyId: ios.ascApiKeyId,
		issuerId: ios.ascApiKeyIssuerId,
		appId: ios.ascAppId,
	};
};

/** apps/chrome-extension/package.json — manifest.js가 읽는 그 값. */
export const readExtensionVersion = () =>
	readJson("apps/chrome-extension/package.json").version;

/**
 * packages/shared/src/constants/ChromeExtension.ts에 박혀 있는 확장 ID.
 *
 * 상수를 여기에 복사해두면 둘이 갈라졌을 때 조용히 엉뚱한 확장을 조회하게 되므로,
 * TS를 파싱하는 대신 그 파일에서 정규식으로 직접 읽습니다.
 */
export const readExtensionId = () => {
	const source = readFileSync(
		join(REPO_ROOT, "packages/shared/src/constants/ChromeExtension.ts"),
		"utf8",
	);
	const matched = source.match(/CHROME_EXTENSION_ID\s*=\s*"([a-z]{32})"/);

	if (!matched) {
		throw new Error("ChromeExtension.ts에서 확장 ID를 찾지 못했습니다");
	}

	return matched[1];
};

/**
 * 프로덕션 웹 주소.
 *
 * packages/env/.env.production 이 이미 이 값을 갖고 있고 레포에 추적되므로
 * (공개돼도 되는 값만 담는 파일입니다) 여기에 URL을 또 박아두지 않습니다.
 */
export const readWebUrl = () => {
	const envFile = readFileSync(
		join(REPO_ROOT, "packages/env/.env.production"),
		"utf8",
	);
	const matched = envFile.match(/^WEB_URL=(.+)$/m);

	if (!matched) {
		throw new Error(".env.production에서 WEB_URL을 찾지 못했습니다");
	}

	return matched[1].trim();
};
