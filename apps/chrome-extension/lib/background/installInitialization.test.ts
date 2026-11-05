import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	set: vi.fn(),
	getUILanguage: vi.fn(),
	configurePanelBehavior: vi.fn(),
	openInstallGuideTab: vi.fn(),
	trackEvent: vi.fn(),
	registerUninstallUrl: vi.fn(),
	reportBackgroundError: vi.fn(),
}));

vi.mock("webextension-polyfill", () => ({}));
vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/constants", () => ({ EXTERNAL_LINK: {} }));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: mocks.get, set: mocks.set },
	STORAGE_KEYS: { language: "language" },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: { UPDATE_SIDE_PANEL: vi.fn() },
		handle: new Proxy({}, { get: () => vi.fn() }),
	},
}));
vi.mock("@web-memo/shared/utils", () => ({
	initSentry: vi.fn(),
	HighlightService: vi.fn(),
	normalizeUrl: vi.fn(),
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	getSupabaseClient: vi.fn(),
	I18n: { get: vi.fn(), getUILanguage: mocks.getUILanguage },
	Tab: { get: vi.fn(), create: vi.fn() },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("./editHighlight", () => ({ handleEditHighlight: vi.fn() }));
vi.mock("./createHighlight", () => ({ handleCreateHighlight: vi.fn() }));
vi.mock("./createMemo", () => ({ handleCreateMemo: vi.fn() }));
vi.mock("./highlightMemo", () => ({
	handleCreateHighlightMemo: vi.fn(),
	handleGetHighlightMemoLinks: vi.fn(),
}));
vi.mock("./getLoginStatus", () => ({ handleGetLoginStatus: vi.fn() }));
vi.mock("./highlightPanel", () => ({
	handleFocusHighlight: vi.fn(),
	notifyHighlightChange: vi.fn(),
}));
vi.mock("./openSidePanelFromWeb", () => ({
	handleOpenSidePanelFromWeb: vi.fn(),
}));
vi.mock("./configurePanelBehavior", () => ({
	configurePanelBehavior: mocks.configurePanelBehavior,
}));
vi.mock("./openInstallGuideTab", () => ({
	openInstallGuideTab: mocks.openInstallGuideTab,
}));
vi.mock("./registerUninstallUrl", () => ({
	registerUninstallUrl: mocks.registerUninstallUrl,
}));
vi.mock("./reportBackgroundError", () => ({
	reportBackgroundError: mocks.reportBackgroundError,
}));

type InstalledListener = Parameters<
	typeof chrome.runtime.onInstalled.addListener
>[0];

async function installListener(): Promise<InstalledListener> {
	const listeners: InstalledListener[] = [];
	vi.stubGlobal("chrome", {
		runtime: {
			OnInstalledReason: { INSTALL: "install", UPDATE: "update" },
			onInstalled: {
				addListener: (listener: InstalledListener) => listeners.push(listener),
			},
		},
		contextMenus: { onClicked: { addListener: vi.fn() } },
		tabs: {
			onUpdated: { addListener: vi.fn() },
			onActivated: { addListener: vi.fn() },
		},
	});
	await import("./index");
	expect(listeners).toHaveLength(2);
	return listeners[0];
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	mocks.getUILanguage.mockReturnValue("ko");
	mocks.trackEvent.mockResolvedValue(undefined);
	mocks.configurePanelBehavior.mockResolvedValue(undefined);
	mocks.set.mockResolvedValue(undefined);
	mocks.openInstallGuideTab.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("background install initialization", () => {
	it("keeps a stored language and opens the guide only on install", async () => {
		const listener = await installListener();
		mocks.get.mockResolvedValue("en");
		await listener({ reason: chrome.runtime.OnInstalledReason.INSTALL });
		expect(mocks.get).toHaveBeenCalledWith("language");
		expect(mocks.set).not.toHaveBeenCalled();
		expect(mocks.openInstallGuideTab).toHaveBeenCalledOnce();
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "extension_installed",
		});
		expect(mocks.reportBackgroundError).not.toHaveBeenCalled();

		mocks.openInstallGuideTab.mockClear();
		mocks.trackEvent.mockClear();
		await listener({ reason: chrome.runtime.OnInstalledReason.UPDATE });
		expect(mocks.openInstallGuideTab).not.toHaveBeenCalled();
		expect(mocks.trackEvent).not.toHaveBeenCalled();
	});

	it("awaits default language storage before opening the install guide", async () => {
		const listener = await installListener();
		mocks.get.mockResolvedValue(undefined);
		let finishSet: (() => void) | undefined;
		mocks.set.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishSet = resolve;
				}),
		);
		const initialization = listener({
			reason: chrome.runtime.OnInstalledReason.INSTALL,
		});
		await vi.waitFor(() =>
			expect(mocks.set).toHaveBeenCalledWith("language", "ko"),
		);
		expect(mocks.openInstallGuideTab).not.toHaveBeenCalled();
		finishSet?.();
		await initialization;
		expect(mocks.openInstallGuideTab).toHaveBeenCalledOnce();
	});

	it("stops after an exact original browser shutdown error in language get", async () => {
		const listener = await installListener();
		const original = new Error("The browser is shutting down.");
		mocks.get.mockRejectedValue(
			new Error("localized storage error", { cause: original }),
		);
		await expect(
			listener({ reason: chrome.runtime.OnInstalledReason.INSTALL }),
		).resolves.toBeUndefined();
		expect(mocks.configurePanelBehavior).toHaveBeenCalledOnce();
		expect(mocks.getUILanguage).not.toHaveBeenCalled();
		expect(mocks.set).not.toHaveBeenCalled();
		expect(mocks.openInstallGuideTab).not.toHaveBeenCalled();
		expect(mocks.reportBackgroundError).not.toHaveBeenCalled();
	});

	it.each([
		["ordinary failure", new Error("storage unavailable")],
		[
			"similar original message",
			new Error("localized", {
				cause: new Error("The browser is shutting down. "),
			}),
		],
		[
			"matching wrapper without cause",
			new Error("The browser is shutting down."),
		],
		[
			"matching string cause",
			new Error("localized", { cause: "The browser is shutting down." }),
		],
	])("reports %s from language get once", async (_label, error) => {
		const listener = await installListener();
		mocks.get.mockRejectedValue(error);
		await expect(
			listener({ reason: chrome.runtime.OnInstalledReason.INSTALL }),
		).resolves.toBeUndefined();
		expect(mocks.reportBackgroundError).toHaveBeenCalledOnce();
		expect(mocks.reportBackgroundError).toHaveBeenCalledWith({
			error,
			feature: "extension",
			operation: "initialize",
			stage: "language_get",
		});
		expect(mocks.set).not.toHaveBeenCalled();
		expect(mocks.openInstallGuideTab).not.toHaveBeenCalled();
	});

	it("reports default language set rejection and does not open the guide", async () => {
		const listener = await installListener();
		const error = new Error("The browser is shutting down.");
		mocks.get.mockResolvedValue(undefined);
		mocks.set.mockRejectedValue(error);
		await expect(
			listener({ reason: chrome.runtime.OnInstalledReason.INSTALL }),
		).resolves.toBeUndefined();
		expect(mocks.reportBackgroundError).toHaveBeenCalledOnce();
		expect(mocks.reportBackgroundError).toHaveBeenCalledWith({
			error,
			feature: "extension",
			operation: "initialize",
			stage: "language_set",
		});
		expect(mocks.openInstallGuideTab).not.toHaveBeenCalled();
	});

	it("reports a guide rejection even when it resembles browser shutdown", async () => {
		const listener = await installListener();
		const error = new Error("localized", {
			cause: new Error("The browser is shutting down."),
		});
		mocks.get.mockResolvedValue("ko");
		mocks.openInstallGuideTab.mockRejectedValue(error);
		await expect(
			listener({ reason: chrome.runtime.OnInstalledReason.INSTALL }),
		).resolves.toBeUndefined();
		expect(mocks.reportBackgroundError).toHaveBeenCalledOnce();
		expect(mocks.reportBackgroundError).toHaveBeenCalledWith({
			error,
			feature: "extension",
			operation: "initialize",
			stage: "install_guide",
		});
	});
});
