import { BridgeRequest, BridgeResponse, BridgeType } from 'bridge/type';

// ref : https://developer.chrome.com/docs/extensions/reference/api/tabs
export class Tab {
  static async get() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab;
  }
  static async sendMessage<TPayload>(type: BridgeType, payload?: TPayload): Promise<BridgeResponse> {
    const tab = await this.get();
    if (!tab.id) throw new Error('Tab not found');
    const response = await chrome.tabs.sendMessage<BridgeRequest<TPayload>, BridgeResponse>(tab.id, {
      type,
      payload,
    });
    return response;
  }
}
