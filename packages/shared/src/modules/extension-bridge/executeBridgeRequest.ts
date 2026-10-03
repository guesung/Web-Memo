import { Runtime } from "../../utils/extension/module/Runtime";
import { Tab } from "../../utils/extension/module/Tab";
import { BridgeError } from "./bridgeError";
import type { BRIDGE_MESSAGE_TYPE } from "./type";

/** 브리지가 사용하는 메시지 전송 방향. */
export type TMessageDirection = "internal" | "toExtension" | "toTab";

/** 민감한 요청 데이터가 없는 최종 실패 기록. */
export interface IFBridgeFailure {
	messageType: string;
	direction: TMessageDirection;
	classification: "ExtensionUnavailable" | "Timeout" | "NoReceiver" | "Unknown";
}

/** 하나의 전체 기한 안에서 동일 수신자에 최대 두 번 전송합니다. */
export const executeBridgeRequest = async (options: {
	messageType: BRIDGE_MESSAGE_TYPE;
	direction: TMessageDirection;
	payload: unknown;
	timeoutMs: number;
	reportFailure: (failure: IFBridgeFailure) => void;
}): Promise<unknown> => {
	let isExpired = false;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const execute = async () => {
		if (
			typeof chrome === "undefined" ||
			typeof chrome.runtime?.sendMessage !== "function" ||
			(options.direction === "toTab" &&
				(typeof chrome.tabs?.query !== "function" ||
					typeof chrome.tabs?.sendMessage !== "function"))
		) {
			throw new BridgeError("ExtensionUnavailable");
		}

		const tab = options.direction === "toTab" ? await Tab.get() : undefined;
		if (options.direction === "toTab" && tab?.id === undefined) {
			throw new BridgeError("NoReceiver");
		}

		for (let attempt = 0; attempt < 2; attempt += 1) {
			if (isExpired) {
				throw new BridgeError("Timeout");
			}

			try {
				switch (options.direction) {
					case "internal":
						return await Runtime.sendMessage(
							options.messageType,
							options.payload,
						);
					case "toExtension":
						return await Runtime.sendMessageToExtension(
							options.messageType,
							options.payload,
						);
					case "toTab":
						if (tab?.id === undefined) {
							throw new BridgeError("NoReceiver");
						}

						return await Tab.sendMessageToTab({
							tabId: tab.id,
							type: options.messageType,
							payload: options.payload,
						});
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : error;
				if (
					typeof message !== "string" ||
					!message.includes("Receiving end does not exist")
				) {
					throw error;
				}
				if (attempt === 1) {
					throw new BridgeError("NoReceiver");
				}
			}
		}

		throw new BridgeError("NoReceiver");
	};

	try {
		const deadline = new Promise<never>((_resolve, reject) => {
			timeout = setTimeout(() => {
				isExpired = true;
				reject(new BridgeError("Timeout"));
			}, options.timeoutMs);
		});

		return await Promise.race([execute(), deadline]);
	} catch (error) {
		const message = error instanceof Error ? error.message : error;
		const failure =
			message === "Extension context invalidated."
				? new BridgeError("ExtensionUnavailable")
				: error;
		try {
			options.reportFailure({
				messageType: options.messageType,
				direction: options.direction,
				classification:
					failure instanceof BridgeError ? failure.code : "Unknown",
			});
		} catch {
			// 진단 기록 실패가 전송 오류를 덮어쓰지 않게 합니다.
		}

		throw failure;
	} finally {
		clearTimeout(timeout);
	}
};
