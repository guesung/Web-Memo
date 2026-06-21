import type {
	BRIDGE_MESSAGE_TYPE,
	BridgeRequest,
} from "../../../modules/extension-bridge";

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
		if (!tab.id) throw new Error("Tab not found");

		const message = await chrome.tabs.sendMessage<
			BridgeRequest<TPayload>,
			TResponse
		>(tab.id, {
			type,
			payload,
		});

		if (!message) throw new Error("Message not found");
		return message;
	}

	static async create(props: chrome.tabs.CreateProperties) {
		await chrome.tabs.create(props);
	}
}
