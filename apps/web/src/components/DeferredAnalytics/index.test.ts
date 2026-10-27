// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeferredAnalytics from ".";

afterEach(() => {
	vi.unstubAllGlobals();
	document
		.querySelectorAll("#deferred-ga, #deferred-gtm")
		.forEach((node) => node.remove());
});

describe("DeferredAnalytics", () => {
	it("queues external downloads until interaction and loads each script once", async () => {
		vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
		const idleCallbacks: IdleRequestCallback[] = [];
		vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
			idleCallbacks.push(callback);
			return idleCallbacks.length;
		});
		vi.stubGlobal("cancelIdleCallback", vi.fn());
		const root = createRoot(document.createElement("div"));

		await act(async () => root.render(createElement(DeferredAnalytics)));
		window.dispatchEvent(new Event("load"));
		expect(
			document.querySelectorAll("#deferred-ga, #deferred-gtm"),
		).toHaveLength(0);

		window.dispatchEvent(new Event("pointerdown"));
		expect(
			document.querySelectorAll("#deferred-ga, #deferred-gtm"),
		).toHaveLength(2);
		expect(
			document.querySelector<HTMLScriptElement>("#deferred-ga")?.src,
		).toContain("/gtag/js?id=");
		expect(
			document.querySelector<HTMLScriptElement>("#deferred-gtm")?.src,
		).toContain("/gtm.js?id=");

		idleCallbacks[0]?.({} as IdleDeadline);
		window.dispatchEvent(new Event("keydown"));
		expect(
			document.querySelectorAll("#deferred-ga, #deferred-gtm"),
		).toHaveLength(2);
		await act(async () => root.unmount());
	});
});
