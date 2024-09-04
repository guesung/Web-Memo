import { BridgeRequest, BridgeResponse, BridgeType } from 'bridge/type';

// ref : https://developer.chrome.com/docs/extensions/reference/api/runtime
export class Runtime {
  static sendMessage<TPayload>(type: BridgeType, payload?: TPayload): Promise<BridgeResponse> {
    return chrome.runtime.sendMessage<BridgeRequest<TPayload>, BridgeResponse>({
      type,
      payload,
    });
  }

  static async onMessage(type: BridgeType, message?: BridgeResponse): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request) reject('No request');
        if (request.type === type) sendResponse(message);
        resolve();
      });
    });
  }

  static async connect<TPayload>(
    type: BridgeType,
    payload: TPayload,
    callbackFn: (message: string) => void,
  ): Promise<void> {
    return new Promise(resolve => {
      const port = chrome.runtime.connect({ name: type });
      port.postMessage(payload);
      port.onMessage.addListener(async message => {
        if (message === null) resolve();
        callbackFn(message);
      });
    });
  }

  static async onConnect(callbackFn: (port: chrome.runtime.Port) => void): Promise<void> {
    chrome.runtime.onConnect.addListener(callbackFn);
  }
}
