import { writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	update: vi.fn(),
	registerUninstallUrl: vi.fn(),
}));

vi.mock("webextension-polyfill", () => ({}));
vi.mock("@web-memo/env", () => ({ CONFIG: {} }));
vi.mock("@web-memo/shared/constants", () => ({ EXTERNAL_LINK: {} }));
vi.mock("@web-memo/shared/modules/chrome-storage", () => ({
	ChromeSyncStorage: { get: vi.fn(), set: vi.fn() },
	STORAGE_KEYS: { language: "language" },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		request: { UPDATE_SIDE_PANEL: mocks.update },
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
	I18n: { get: vi.fn(), getUILanguage: vi.fn() },
	Tab: { get: vi.fn(), create: vi.fn() },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
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
vi.mock("./openInstallGuideTab", () => ({ openInstallGuideTab: vi.fn() }));
vi.mock("./registerUninstallUrl", () => ({
	registerUninstallUrl: mocks.registerUninstallUrl,
}));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
});

describe("background tab update filtering", () => {
	it("sends only active-tab page changes while retaining activation updates", async () => {
		let onUpdated:
			| Parameters<typeof chrome.tabs.onUpdated.addListener>[0]
			| undefined;
		let onActivated:
			| Parameters<typeof chrome.tabs.onActivated.addListener>[0]
			| undefined;
		vi.stubGlobal("chrome", {
			runtime: { onInstalled: { addListener: vi.fn() } },
			contextMenus: { onClicked: { addListener: vi.fn() } },
			tabs: {
				onUpdated: {
					addListener: (listener: typeof onUpdated) => {
						onUpdated = listener;
					},
				},
				onActivated: {
					addListener: (listener: typeof onActivated) => {
						onActivated = listener;
					},
				},
			},
		});
		try {
			await import("./index");
			expect(onUpdated).toBeTypeOf("function");
			expect(onActivated).toBeTypeOf("function");
			if (!onUpdated || !onActivated)
				throw new Error("tab listeners not registered");
			const updated = onUpdated;
			const activated = onActivated;
			const activeTab = {
				id: 1,
				windowId: 1,
				active: true,
				highlighted: true,
				index: 0,
				incognito: false,
				pinned: false,
				selected: true,
				discarded: false,
				autoDiscardable: true,
				groupId: -1,
			} satisfies chrome.tabs.Tab;
			const inactiveTab = {
				...activeTab,
				id: 2,
				active: false,
				highlighted: false,
				selected: false,
			};
			const otherWindowActiveTab = { ...activeTab, id: 3, windowId: 2 };
			const counts = {
				inactiveAudible: [] as number[],
				activeAudible: [] as number[],
				activeMuted: [] as number[],
				inactiveRelevant: [] as number[],
				positive: [] as number[],
				positiveEach: [] as number[][],
				activation: 0,
			};
			for (let repeat = 0; repeat < 7; repeat++) {
				const measure = async (
					tab: chrome.tabs.Tab & { id: number },
					changes: chrome.tabs.TabChangeInfo,
					events: number,
				) => {
					mocks.update.mockClear();
					for (let i = 0; i < events; i++) await updated(tab.id, changes, tab);
					return mocks.update.mock.calls.length;
				};
				counts.inactiveAudible.push(
					await measure(inactiveTab, { audible: true }, 100),
				);
				counts.activeAudible.push(
					await measure(activeTab, { audible: true }, 100),
				);
				counts.activeMuted.push(
					await measure(activeTab, { mutedInfo: { muted: true } }, 100),
				);
				counts.inactiveRelevant.push(
					await measure(inactiveTab, { url: "https://example.com/other" }, 1),
				);
				mocks.update.mockClear();
				const positiveEach: number[] = [];
				for (const changes of [
					{ url: "https://example.com/next" },
					{ status: "loading" },
					{ status: "complete" },
					{ title: "" },
					{ favIconUrl: "" },
					{ audible: true, title: "updated" },
				] as chrome.tabs.TabChangeInfo[]) {
					const before = mocks.update.mock.calls.length;
					await updated(activeTab.id, changes, activeTab);
					positiveEach.push(mocks.update.mock.calls.length - before);
				}
				const beforeOtherWindow = mocks.update.mock.calls.length;
				await updated(
					otherWindowActiveTab.id,
					{ url: "https://example.com/other-window" },
					otherWindowActiveTab,
				);
				positiveEach.push(mocks.update.mock.calls.length - beforeOtherWindow);
				counts.positiveEach.push(positiveEach);
				counts.positive.push(mocks.update.mock.calls.length);
			}
			mocks.update.mockClear();
			await activated({ tabId: activeTab.id, windowId: activeTab.windowId });
			counts.activation = mocks.update.mock.calls.length;
			if (process.env.IMPROVE_EVIDENCE_FILE) {
				writeFileSync(
					process.env.IMPROVE_EVIDENCE_FILE,
					JSON.stringify(counts, null, 2),
				);
			}
			expect(counts.positive).toEqual(Array(7).fill(7));
			expect(counts.positiveEach).toEqual(
				Array.from({ length: 7 }, () => Array(7).fill(1)),
			);
			expect(counts.activation).toBe(1);
			expect(counts.inactiveAudible).toEqual(Array(7).fill(0));
			expect(counts.activeAudible).toEqual(Array(7).fill(0));
			expect(counts.activeMuted).toEqual(Array(7).fill(0));
			expect(counts.inactiveRelevant).toEqual(Array(7).fill(0));
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
