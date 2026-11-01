import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openInstallGuideTab } from "./openInstallGuideTab";

const mocks = vi.hoisted(() => ({
	getExtensionClientId: vi.fn(),
	trackEvent: vi.fn(),
	createTab: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://www.webmemo.xyz" },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: {
		getExtensionClientId: mocks.getExtensionClientId,
		trackEvent: mocks.trackEvent,
	},
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	Tab: { create: mocks.createTab },
}));

beforeEach(() => {
	mocks.getExtensionClientId.mockReset().mockResolvedValue("client.id");
	mocks.trackEvent.mockReset().mockResolvedValue(undefined);
	mocks.createTab.mockReset().mockResolvedValue({ id: 1 });
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

const openedUrl = () => new URL(mocks.createTab.mock.calls[0][0].url);

describe("설치 가이드 탭 열기", () => {
	it("ext_cid를 실어 가이드를 열고, 연 뒤에 성공 이벤트를 보낸다", async () => {
		await openInstallGuideTab();

		expect(openedUrl().toString()).toBe(
			"https://www.webmemo.xyz/install?ext_cid=client.id",
		);
		expect(mocks.trackEvent).toHaveBeenCalledOnce();
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "install_guide_tab_opened",
			params: { is_success: true },
		});
		expect(mocks.createTab.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.trackEvent.mock.invocationCallOrder[0],
		);
	});

	it("탭 생성이 실패하면 실패 이벤트를 보내고 던지지 않는다", async () => {
		mocks.createTab.mockRejectedValue(new Error("tabs failed"));

		await expect(openInstallGuideTab()).resolves.toBeUndefined();
		expect(mocks.trackEvent).toHaveBeenCalledOnce();
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "install_guide_tab_opened",
			params: { is_success: false },
		});
	});

	it("이벤트 전송이 실패해도 설치 흐름을 막지 않는다", async () => {
		mocks.trackEvent.mockRejectedValue(new Error("network"));

		await expect(openInstallGuideTab()).resolves.toBeUndefined();
		expect(mocks.createTab).toHaveBeenCalledOnce();
	});

	it("이벤트 전송이 끝날 때까지 기다린다", async () => {
		let resolveTrack!: () => void;
		mocks.trackEvent.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveTrack = resolve;
			}),
		);
		let isSettled = false;
		const pending = openInstallGuideTab().then(() => {
			isSettled = true;
		});

		await vi.waitFor(() => expect(mocks.trackEvent).toHaveBeenCalled());
		expect(isSettled).toBe(false);
		resolveTrack();
		await pending;
		expect(isSettled).toBe(true);
	});

	it("client_id를 얻지 못하면 ext_cid 없이 연다", async () => {
		mocks.getExtensionClientId.mockRejectedValue(new Error("storage failed"));

		await openInstallGuideTab();

		expect(openedUrl().searchParams.has("ext_cid")).toBe(false);
		expect(mocks.trackEvent).toHaveBeenCalledWith({
			name: "install_guide_tab_opened",
			params: { is_success: true },
		});
	});
});
