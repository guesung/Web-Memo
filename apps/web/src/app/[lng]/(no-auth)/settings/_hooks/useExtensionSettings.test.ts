// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useExtensionSettings } from "./useExtensionSettings";

const { getSettings, setSetting, getManifest } = vi.hoisted(() => ({
	getSettings: vi.fn(),
	setSetting: vi.fn(),
	getManifest: vi.fn(),
}));

vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: {
			GET_EXTENSION_SETTINGS: getSettings,
			SET_EXTENSION_SETTING: setSetting,
			GET_EXTENSION_MANIFEST: getManifest,
		},
	},
}));

/** 기존 프로필 값을 읽기만 하는지 확인하기 위한 응답입니다. */
const EXISTING_SETTINGS = {
	language: "ja",
	autoApplyCategory: false,
	highlightBubbleEnabled: false,
	highlightBubblePosition: "above",
	highlightDisabledSites: ["example.com"],
};

/** 테스트에서 관측하는 훅 상태입니다. */
type TSettingsState = ReturnType<typeof useExtensionSettings>;

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

beforeEach(() => {
	vi.clearAllMocks();
	getSettings.mockResolvedValue({
		success: true,
		protocolVersion: 1,
		settings: EXISTING_SETTINGS,
	});
	getManifest.mockRejectedValue(new Error("No extension"));
});

afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = "";
});

const renderSettings = async () => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	let current: TSettingsState | undefined;
	const TestSettings = () => {
		current = useExtensionSettings();

		return null;
	};
	await act(async () => root.render(createElement(TestSettings)));

	return {
		getState: () => {
			if (!current) {
				throw new Error("Settings did not render");
			}

			return current;
		},
		unmount: async () => act(async () => root.unmount()),
	};
};

describe("public extension settings", () => {
	it("reads all existing values without writing defaults or changing unknown languages", async () => {
		const view = await renderSettings();
		expect(view.getState().settings).toEqual(EXISTING_SETTINGS);
		expect(view.getState().connection).toBe("ready");
		expect(setSetting).not.toHaveBeenCalled();
		await view.unmount();
	});

	it("keeps the saved value on failure and retries only the selected key", async () => {
		setSetting
			.mockResolvedValueOnce({ success: false, error: "storage_write_failed" })
			.mockResolvedValueOnce({
				success: true,
				key: "autoApplyCategory",
				value: true,
			});
		const view = await renderSettings();
		await act(async () =>
			view
				.getState()
				.handleSettingChange({ key: "autoApplyCategory", value: true }),
		);
		expect(view.getState().settings?.autoApplyCategory).toBe(false);
		expect(view.getState().saves.autoApplyCategory?.status).toBe("failed");
		await act(async () =>
			view.getState().handleSaveRetryClick("autoApplyCategory"),
		);
		expect(setSetting).toHaveBeenNthCalledWith(2, {
			key: "autoApplyCategory",
			value: true,
		});
		expect(view.getState().settings).toEqual({
			...EXISTING_SETTINGS,
			autoApplyCategory: true,
		});
		await view.unmount();
	});

	it("ends an unanswered connection after five seconds without exposing default values", async () => {
		vi.useFakeTimers();
		getSettings.mockImplementation(() => new Promise(() => {}));
		const view = await renderSettings();
		expect(view.getState().connection).toBe("loading");
		await act(async () => vi.advanceTimersByTimeAsync(5000));
		expect(view.getState().connection).toBe("unavailable");
		expect(view.getState().settings).toBeNull();
		expect(setSetting).not.toHaveBeenCalled();
		await view.unmount();
	});

	it("distinguishes a storage read error, forbidden origin, and old extension", async () => {
		getSettings.mockResolvedValueOnce({
			success: false,
			error: "storage_read_failed",
		});
		let view = await renderSettings();
		expect(view.getState().connection).toBe("read-error");
		await view.unmount();

		getSettings.mockResolvedValueOnce({ success: false, error: "forbidden" });
		view = await renderSettings();
		expect(view.getState().connection).toBe("forbidden");
		await view.unmount();

		getSettings.mockResolvedValueOnce(undefined);
		getManifest.mockResolvedValueOnce({ manifest_version: 3 });
		view = await renderSettings();
		expect(view.getState().connection).toBe("unsupported");
		await view.unmount();
	});

	it("keeps a site exception after a timed-out write and ignores its late reply", async () => {
		vi.useFakeTimers();
		let resolveWrite: (value: unknown) => void = () => {};
		setSetting.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveWrite = resolve;
				}),
		);
		const view = await renderSettings();
		await act(async () => {
			void view
				.getState()
				.handleSettingChange({ key: "highlightDisabledSites", value: [] });
		});
		await act(async () => vi.advanceTimersByTimeAsync(5000));
		expect(view.getState().saves.highlightDisabledSites?.status).toBe("failed");
		expect(view.getState().settings?.highlightDisabledSites).toEqual([
			"example.com",
		]);
		await act(async () =>
			resolveWrite({ success: true, key: "highlightDisabledSites", value: [] }),
		);
		expect(view.getState().settings?.highlightDisabledSites).toEqual([
			"example.com",
		]);
		await view.unmount();
	});

	it("re-reads storage after a lost save response and shows a confirmed write", async () => {
		vi.useFakeTimers();
		getSettings
			.mockResolvedValueOnce({
				success: true,
				protocolVersion: 1,
				settings: EXISTING_SETTINGS,
			})
			.mockResolvedValueOnce({
				success: true,
				protocolVersion: 1,
				settings: { ...EXISTING_SETTINGS, autoApplyCategory: true },
			});
		setSetting.mockImplementation(() => new Promise(() => {}));
		const view = await renderSettings();

		await act(async () => {
			void view
				.getState()
				.handleSettingChange({ key: "autoApplyCategory", value: true });
		});
		await act(async () => vi.advanceTimersByTimeAsync(5000));

		expect(getSettings).toHaveBeenCalledTimes(2);
		expect(view.getState().settings?.autoApplyCategory).toBe(true);
		expect(view.getState().saves.autoApplyCategory?.status).toBe("saved");
		await view.unmount();
	});

	it("shows save failure at five seconds even when confirmation read also hangs", async () => {
		vi.useFakeTimers();
		setSetting.mockImplementation(() => new Promise(() => {}));
		getSettings
			.mockResolvedValueOnce({
				success: true,
				protocolVersion: 1,
				settings: EXISTING_SETTINGS,
			})
			.mockImplementationOnce(() => new Promise(() => {}));
		const view = await renderSettings();
		await act(async () => {
			void view
				.getState()
				.handleSettingChange({ key: "autoApplyCategory", value: true });
		});
		await act(async () => vi.advanceTimersByTimeAsync(5000));
		expect(view.getState().saves.autoApplyCategory?.status).toBe("failed");
		expect(view.getState().settings?.autoApplyCategory).toBe(false);
		await view.unmount();
	});

	it("rejects incompatible responses and reloads external values on window focus", async () => {
		getSettings.mockResolvedValueOnce({
			success: true,
			protocolVersion: 2,
			settings: EXISTING_SETTINGS,
		});
		const view = await renderSettings();
		expect(view.getState().connection).toBe("unsupported");
		expect(view.getState().settings).toBeNull();
		await act(async () => window.dispatchEvent(new Event("focus")));
		expect(view.getState().connection).toBe("ready");
		expect(view.getState().settings).toEqual(EXISTING_SETTINGS);
		await view.unmount();
	});
});
