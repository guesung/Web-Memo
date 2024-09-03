import { BridgeRequest, BridgeResponse, BridgeType } from 'bridge/type';

// ref : https://developer.chrome.com/docs/extensions/reference/api/runtime
export class Runtime {
  static async onMessage<T>(type: BridgeType, response: T, callbackFn?: () => void): Promise<void> {
    await chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === type) {
        sendResponse(response);
        callbackFn?.();
      }
    });
  }
  static async sendMessage<TPayload>(type: BridgeType, payload?: TPayload): Promise<BridgeResponse> {
    const response = await chrome.runtime.sendMessage<BridgeRequest<TPayload>, BridgeResponse>({
      type,
      payload,
    });
    return response;
  }
}
