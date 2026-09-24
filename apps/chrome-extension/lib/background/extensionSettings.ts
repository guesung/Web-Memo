import { CONFIG } from "@web-memo/env";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import {
	bridge,
	type IFExtensionSettings,
	type IFSetExtensionSettingPayload,
	type TExtensionSettingKey,
} from "@web-memo/shared/modules/extension-bridge";

const WEB_ORIGIN = new URL(CONFIG.webUrl).origin;

/** 허용된 웹 출처에만 확장 설정 조회·저장 및 계정 설정 갱신 통지를 엽니다. */
export const registerExtensionSettingsHandlers = () => {
	bridge.handle.GET_EXTENSION_SETTINGS(async (_payload, sender, sendResponse) => {
		if (!isAllowedWebSender(sender)) {
			sendResponse({ success: false, error: "forbidden" });
			return;
		}

		try {
			const settings = await getExtensionSettings();
			sendResponse({ success: true, protocolVersion: 1, settings });
		} catch {
			sendResponse({ success: false, error: "storage_read_failed" });
		}
	});

	bridge.handle.SET_EXTENSION_SETTING(async (payload, sender, sendResponse) => {
		if (!isAllowedWebSender(sender)) {
			sendResponse({ success: false, error: "forbidden" });
			return;
		}
		if (!isValidSettingPayload(payload)) {
			sendResponse({ success: false, error: "invalid_setting" });
			return;
		}

		try {
			await ChromeSyncStorage.set(payload.key, payload.value);
			sendResponse({ success: true, key: payload.key, value: payload.value });
		} catch {
			sendResponse({ success: false, error: "storage_write_failed" });
		}
	});

	bridge.handle.NOTIFY_SETTING_UPDATED((payload, sender, sendResponse) => {
		if (!isAllowedWebSender(sender) || !payload || typeof payload.userId !== "string" || !payload.userId) {
			sendResponse({ success: false });
			return;
		}

		void bridge.request.SETTING_UPDATED({ userId: payload.userId }).catch(() => {});
		sendResponse({ success: true });
	});
};

const isAllowedWebSender = (sender: chrome.runtime.MessageSender): boolean => {
	if (!sender.url) {
		return false;
	}

	try {
		return new URL(sender.url).origin === WEB_ORIGIN;
	} catch {
		return false;
	}
};

const getExtensionSettings = async (): Promise<IFExtensionSettings> => {
	const [language, autoApplyCategory, highlightBubbleEnabled, highlightBubblePosition, highlightDisabledSites] = await Promise.all([
		ChromeSyncStorage.get<string>(STORAGE_KEYS.language),
		ChromeSyncStorage.get<boolean>(STORAGE_KEYS.autoApplyCategory),
		ChromeSyncStorage.get<boolean>(STORAGE_KEYS.highlightBubbleEnabled),
		ChromeSyncStorage.get<string>(STORAGE_KEYS.highlightBubblePosition),
		ChromeSyncStorage.get<string[]>(STORAGE_KEYS.highlightDisabledSites),
	]);

	return {
		language: language ?? "ko",
		autoApplyCategory: autoApplyCategory ?? true,
		highlightBubbleEnabled: highlightBubbleEnabled ?? true,
		highlightBubblePosition: highlightBubblePosition === "above" ? "above" : "below",
		highlightDisabledSites: highlightDisabledSites ?? [],
	};
};

const isValidSettingPayload = (payload: unknown): payload is IFSetExtensionSettingPayload => {
	if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
		return false;
	}
	const request = payload as Record<string, unknown>;
	if (Object.keys(request).length !== 2 || !("key" in request) || !("value" in request)) {
		return false;
	}

	switch (request.key as TExtensionSettingKey) {
		case "language":
			return request.value === "ko" || request.value === "en-US";
		case "autoApplyCategory":
		case "highlightBubbleEnabled":
			return typeof request.value === "boolean";
		case "highlightBubblePosition":
			return request.value === "above" || request.value === "below";
		case "highlightDisabledSites":
			return Array.isArray(request.value) && request.value.length <= 1000 && request.value.every((site) => typeof site === "string" && site.length > 0 && site.length <= 253);
		default:
			return false;
	}
};
