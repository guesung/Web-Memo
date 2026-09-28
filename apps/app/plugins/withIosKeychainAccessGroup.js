const fs = require("node:fs");
const path = require("node:path");
const { withEntitlementsPlist } = require("expo/config-plugins");
const {
	getAppGroup,
	getShareExtensionName,
} = require("expo-share-extension/plugin/build/index");

/**
 * 배열 값만 가진 단순 entitlements plist(XML)를 만든다.
 * @description expo-share-extension이 만드는 공유 확장 entitlements 파일과 같은
 * 형태(문자열 배열 dict)만 다루므로, 별도 plist 파서 없이 직접 문자열을 조립한다.
 */
function buildArrayEntitlementsPlistXml(entries) {
	const body = Object.entries(entries)
		.map(([key, values]) => {
			const items = values
				.map((value) => `\t\t<string>${value}</string>`)
				.join("\n");
			return `\t<key>${key}</key>\n\t<array>\n${items}\n\t</array>`;
		})
		.join("\n");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">',
		"<dict>",
		body,
		"</dict>",
		"</plist>",
		"",
	].join("\n");
}

/**
 * 본 앱과 iOS 공유 확장이 로그인 세션 키체인 항목(App Group 기반)을 공유하도록
 * keychain-access-groups entitlement를 양쪽 타깃에 추가한다.
 * @description app.json의 plugins 배열에서 반드시 "expo-share-extension" 앞에
 * 등록해야 한다. config-plugins의 entitlements mod는 나중에 등록된 플러그인의
 * 액션이 먼저 실행되고 이전 플러그인에 위임하는 방식으로 합성되므로(LIFO), 이 플러그인을
 * 앞서 등록해야 실제로는 expo-share-extension의 entitlements 파일 생성 뒤에 실행되어
 * 그 파일을 App Group 값 그대로 keychain-access-groups까지 포함해 다시 쓸 수 있다.
 */
function withIosKeychainAccessGroup(config) {
	config = withEntitlementsPlist(config, (config) => {
		const appGroup = getAppGroup(config);
		const existing = config.modResults["keychain-access-groups"] ?? [];
		config.modResults["keychain-access-groups"] = Array.from(
			new Set([...existing, `$(AppIdentifierPrefix)${appGroup}`]),
		);
		return config;
	});

	return withEntitlementsPlist(config, (config) => {
		const appGroup = getAppGroup(config);
		const targetName = getShareExtensionName(config);
		const targetPath = path.join(
			config.modRequest.platformProjectRoot,
			targetName,
		);
		const filePath = path.join(targetPath, `${targetName}.entitlements`);

		const entitlements = {
			"com.apple.security.application-groups": [appGroup],
			"keychain-access-groups": [`$(AppIdentifierPrefix)${appGroup}`],
		};
		if (config.ios?.usesAppleSignIn) {
			entitlements["com.apple.developer.applesignin"] = ["Default"];
		}

		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, buildArrayEntitlementsPlistXml(entitlements));

		return config;
	});
}

module.exports = withIosKeychainAccessGroup;
