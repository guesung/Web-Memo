import fs from "node:fs";

import deepmerge from "deepmerge";
import { CONFIG } from "@web-memo/env";

import {
	getExternallyConnectableMatches,
	getManifestKey,
	getOAuth2ClientId,
} from "./lib/manifestConfig.js";

const packageJson = JSON.parse(fs.readFileSync("../../package.json", "utf8"));

const sidePanelConfig = {
	side_panel: {
		default_path: "side-panel/index.html",
	},
};

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
			matches: getExternallyConnectableMatches(),
		},
		action: {
			default_popup: "popup/index.html",
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
		key: getManifestKey(),
		oauth2: {
			client_id: getOAuth2ClientId(),
			scopes: ["openid", "email", "profile"],
		},
	},
	!CONFIG.isFirefox && sidePanelConfig,
);

export default manifest;
