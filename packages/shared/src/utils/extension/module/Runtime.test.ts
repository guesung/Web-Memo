import { afterEach, describe, expect, it, vi } from "vitest";
import { Runtime } from "./Runtime";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("웹과 확장 사이의 런타임 메시지", () => {
	it("외부 요청의 payload를 확장에 전송한다", async () => {
		const sendMessage = vi.fn().mockResolvedValue({ success: true });
		vi.stubGlobal("chrome", { runtime: { sendMessage } });

		await Runtime.sendMessageToExtension("SET_EXTENSION_SETTING", {
			key: "language",
			value: "ko",
		});

		expect(sendMessage).toHaveBeenCalledWith(expect.any(String), {
			type: "SET_EXTENSION_SETTING",
			payload: { key: "language", value: "ko" },
		});
	});

	it("비동기 외부 응답이 도착할 때까지 메시지 채널을 유지한다", async () => {
		let listener:
			| ((
					request: { type: string },
					sender: object,
					respond: (value: string) => void,
			  ) => unknown)
			| undefined;
		vi.stubGlobal("chrome", {
			runtime: {
				onMessageExternal: {
					addListener: (callback: typeof listener) => {
						listener = callback;
					},
					removeListener: vi.fn(),
				},
			},
		});
		const sendResponse = vi.fn();
		Runtime.onMessageExternal(
			"GET_EXTENSION_SETTINGS",
			async (_request, _sender, respond) => {
				await Promise.resolve();
				respond("done");
			},
		);

		const keepAlive = listener?.(
			{ type: "GET_EXTENSION_SETTINGS" },
			{},
			sendResponse,
		);
		expect(keepAlive).toBe(true);
		await Promise.resolve();
		expect(sendResponse).toHaveBeenCalledWith("done");
	});
});
