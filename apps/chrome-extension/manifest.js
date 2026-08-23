import fs from "node:fs";

import { CONFIG } from "@web-memo/env";
import deepmerge from "deepmerge";

// 확장 ID를 고정하는 공개 키입니다. manifest.json에 실려 배포되므로 비밀이 아닙니다.
// 이 파일은 vite 번들을 거치지 않고 make-manifest 플러그인이 Node로 직접 읽어서,
// TS 상수 모듈을 import할 수 없어 여기 둡니다.
const EXTENSION_KEY =
	"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAob5nrfpKAihURRka74OiALrnMN9aHytr7Ik7vGzbtoVrc6xecQYj+fw1qHfax0gwQi4bql0/Ah3Zb2u7zPmPPvoPStgittQUgg5IVxJIij1cIbRgY+MvQh3z3YU27lA4zANOauhb7Q8Z9ocDr9OoZqX0rBMk9zXSk/UlgDZhRkMuyG8R1DSVUe0qFSIwKFQFMDWp1VmgMR8p9htrhGoOE8kIPxUxKHiVOHw2Dd+u5jASk462HcS7OptLpfAIZsgk/enj0LumPzjANu062ZUBbTUHUzWUL9540UTI6slfuvcjwRKLAtOpg8FN3yaNvCZKOO5Ot9Qy23zZ4LoItHt+TwIDAQAB";



// 확장 버전의 단일 진실 원천은 확장 자신의 package.json입니다.
// 루트 package.json은 버전을 갖지 않습니다. (docs/versioning.md 참고)
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */

const manifest = deepmerge(
	{
		manifest_version: 3,
		name: "__MSG_extensionName__",
		version: packageJson.version,
		description: "__MSG_extensionDescription__",
		default_locale: "ko",
		permissions: ["sidePanel", "storage", "tabs", "contextMenus", "cookies"],
		host_permissions: ["<all_urls>"],
		options_page: "options/index.html",
		background: {
			service_worker: "background.iife.js",
			type: "module",
		},
		externally_connectable: {
			matches: [`${CONFIG.webUrl}/*`],
		},
		action: {
			default_icon: "icon-34.png",
		},
		icons: {
			16: "icon-16.png",
			48: "icon-48.png",
			128: "icon-128.png",
		},
		content_scripts: [
			{
				matches: ["http://*/*", "https://*/*", "<all_urls>"],
				js: ["content-ui/index.iife.js"],
			},
			{
				matches: ["http://*/*", "https://*/*", "<all_urls>"],
				css: ["content.css"],
			},
		],
		web_accessible_resources: [
			{
				resources: [
					"*.js",
					"*.css",
					"*.svg",
					"icon-128.png",
					"icon-34.png",
					"icon-16.png",
					"icon-48.png",
				],
				matches: ["*://*/*"],
			},
		],
		commands: {
			_execute_action: {
				suggested_key: "Alt+S",
			},
		},
		key: EXTENSION_KEY,
	},
	{
		side_panel: {
			default_path: "side-panel/index.html",
		},
	}
);

export default manifest;
