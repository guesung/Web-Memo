import { addBreadcrumb } from "@sentry/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBridge, defineMessage } from "./createBridge";

vi.mock("@sentry/react", () => ({
	addBreadcrumb: vi.fn(),
	captureException: vi.fn(),
}));

const DIRECTIONS = ["internal", "toExtension", "toTab"] as const;
const CLASSIFICATIONS = [
	"ExtensionUnavailable",
	"Timeout",
	"NoReceiver",
	"Unknown",
] as const;
const sendMessage = vi.fn();
const sendTabMessage = vi.fn();
const queryTabs = vi.fn();

beforeEach(() => {
	vi.useFakeTimers();
	vi.resetAllMocks();
	vi.stubGlobal("chrome", {
		runtime: { sendMessage },
		tabs: { query: queryTabs, sendMessage: sendTabMessage },
	});
	queryTabs.mockResolvedValue([{ id: 17 }]);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe.each(DIRECTIONS)("default deadline for %s", (direction) => {
	it("rejects only at 10 seconds and releases the deadline timer", async () => {
		sendMessage.mockImplementation(() => new Promise(() => {}));
		sendTabMessage.mockImplementation(() => new Promise(() => {}));
		const testBridge = createBridge({
			GET_TABS: defineMessage(direction),
		});
		const assertion = expect(
			testBridge.request.GET_TABS(),
		).rejects.toMatchObject({
			code: "Timeout",
		});

		await vi.advanceTimersByTimeAsync(9_999);
		expect(addBreadcrumb).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(1);
		await vi.advanceTimersByTimeAsync(1);
		await assertion;
		expect(addBreadcrumb).toHaveBeenCalledTimes(1);
		expect(addBreadcrumb).toHaveBeenCalledWith({
			category: "extension.bridge",
			level: "warning",
			data: { messageType: "GET_TABS", direction, classification: "Timeout" },
		});
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe.each(DIRECTIONS)("final failure breadcrumb for %s", (direction) => {
	it.each(CLASSIFICATIONS)(
		"records exactly one sanitized %s breadcrumb for a logical request",
		async (classification) => {
			const privateUrl = "https://private.example.test/memo?token=secret-token";
			const privatePayload = { url: privateUrl, memo: "private memo body" };
			const originalError = new Error(
				`private transport failure: ${privateUrl}`,
			);
			const transport = direction === "toTab" ? sendTabMessage : sendMessage;
			const testBridge = createBridge({
				CREATE_MEMO: defineMessage<typeof privatePayload>(direction),
			});
			switch (classification) {
				case "ExtensionUnavailable":
					vi.stubGlobal("chrome", undefined);
					break;
				case "Timeout":
					transport.mockImplementation(() => new Promise(() => {}));
					break;
				case "NoReceiver":
					transport.mockRejectedValue(
						new Error(`Receiving end does not exist. ${privateUrl}`),
					);
					break;
				case "Unknown":
					transport.mockRejectedValue(originalError);
					break;
			}

			const request = testBridge.request.CREATE_MEMO(privatePayload);
			const assertion =
				classification === "Unknown"
					? expect(request).rejects.toBe(originalError)
					: expect(request).rejects.toMatchObject({ code: classification });
			await vi.advanceTimersByTimeAsync(10_000);
			await assertion;
			expect(addBreadcrumb).toHaveBeenCalledTimes(1);
			expect(addBreadcrumb).toHaveBeenCalledWith({
				category: "extension.bridge",
				level: "warning",
				data: { messageType: "CREATE_MEMO", direction, classification },
			});
			const serializedBreadcrumb = JSON.stringify(
				vi.mocked(addBreadcrumb).mock.calls,
			);
			expect(serializedBreadcrumb).not.toContain(privateUrl);
			expect(serializedBreadcrumb).not.toContain(privatePayload.memo);
			expect(serializedBreadcrumb).not.toContain(originalError.message);
			expect(serializedBreadcrumb).not.toContain(
				"Receiving end does not exist",
			);
			expect(serializedBreadcrumb).not.toContain("payload");
			expect(serializedBreadcrumb).not.toContain("url");
			if (classification === "NoReceiver") {
				expect(transport).toHaveBeenCalledTimes(2);
			} else if (classification === "ExtensionUnavailable") {
				expect(transport).not.toHaveBeenCalled();
			} else {
				expect(transport).toHaveBeenCalledTimes(1);
			}
			expect(vi.getTimerCount()).toBe(0);
		},
	);
});
