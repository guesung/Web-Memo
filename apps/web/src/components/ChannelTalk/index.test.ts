// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChannelTalk from ".";

const mocks = vi.hoisted(() => ({
	pathname: "/ko/introduce",
	loadScript: vi.fn(),
	boot: vi.fn(),
	shutdown: vi.fn(),
	showMessenger: vi.fn(),
	onHideMessenger: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@web-memo/env", () => ({ CONFIG: { buildEnv: "development" } }));
vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@channel.io/channel-web-sdk-loader", () => ({
	loadScript: mocks.loadScript,
	boot: mocks.boot,
	shutdown: mocks.shutdown,
	showMessenger: mocks.showMessenger,
	onHideMessenger: mocks.onHideMessenger,
}));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	mocks.pathname = "/ko/introduce";
	delete process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY;
});

describe("ChannelTalk", () => {
	it("keeps the button disabled until deferred boot completes, then shuts down on route exit", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY = "test-plugin-key";
		let idleCallback: IdleRequestCallback | undefined;
		vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
			idleCallback = callback;
			return 1;
		});
		vi.stubGlobal("cancelIdleCallback", vi.fn());
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () =>
			root.render(createElement(ChannelTalk, { lng: "ko" })),
		);
		const button = document.querySelector<HTMLButtonElement>(
			'button[aria-label="support.openLabel"]',
		);
		expect(button?.disabled).toBe(true);
		expect(mocks.loadScript).not.toHaveBeenCalled();

		window.dispatchEvent(new Event("load"));
		await act(async () => idleCallback?.({} as IdleDeadline));
		expect(mocks.loadScript).toHaveBeenCalledOnce();
		expect(mocks.boot).toHaveBeenCalledOnce();
		expect(mocks.boot.mock.calls[0]?.[0]).toMatchObject({
			pluginKey: "test-plugin-key",
			hideChannelButtonOnBoot: true,
			hidePopup: true,
		});

		await act(async () => mocks.boot.mock.calls[0]?.[1](null, null));
		expect(button?.disabled).toBe(false);
		button?.click();
		expect(mocks.showMessenger).toHaveBeenCalledOnce();

		mocks.pathname = "/ko/login";
		await act(async () =>
			root.render(createElement(ChannelTalk, { lng: "ko" })),
		);
		expect(mocks.shutdown).toHaveBeenCalledOnce();
		expect(
			document.querySelector('[aria-label="support.openLabel"]'),
		).toBeNull();
		await act(async () => root.unmount());
		container.remove();
	});
});
