import type {
	BRIDGE_MESSAGE_TYPE,
	BridgeRequest,
} from "../../../modules/extension-bridge";
import { BridgeError } from "../../../modules/extension-bridge/bridgeError";

/** 활성 탭 조회와 탭 메시지 전송. */
export class Tab {
	static async get() {
		// 사이드 패널은 창마다 별도 인스턴스로 동작한다. lastFocusedWindow를 쓰면
		// 새 창을 열었을 때 기존 창의 사이드 패널이 새 창의 활성 탭을 가져오므로,
		// 자신이 속한 창(currentWindow)의 활성 탭을 조회해야 한다.
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		return tab;
	}

	static async sendMessage<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		payload?: TPayload,
	) {
		const tab = await Tab.get();
		if (tab?.id === undefined) {
			throw new BridgeError("NoReceiver");
		}

		return Tab.sendMessageToTab<TPayload, TResponse>({
			tabId: tab.id,
			type,
			payload,
		});
	}

	static sendMessageToTab<TPayload, TResponse>(options: {
		tabId: number;
		type: BRIDGE_MESSAGE_TYPE;
		payload?: TPayload;
	}): Promise<TResponse> {
		return chrome.tabs.sendMessage<BridgeRequest<TPayload>, TResponse>(
			options.tabId,
			{
				type: options.type,
				payload: options.payload,
			},
		);
	}

	static async create(props: chrome.tabs.CreateProperties) {
		await chrome.tabs.create(props);
	}
}
