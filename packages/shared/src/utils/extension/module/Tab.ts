import type {
	BRIDGE_MESSAGE_TYPE,
	BridgeRequest,
} from "@src/modules/extension-bridge";

export class Tab {
	static async get() {
		const [tab] = await chrome.tabs.query({
			active: true,
			lastFocusedWindow: true,
		});
		return tab;
	}

	static async sendMessage<TPayload, TResponse>(
		type: BRIDGE_MESSAGE_TYPE,
		payload?: TPayload,
	) {
		const tab = await this.get();
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
