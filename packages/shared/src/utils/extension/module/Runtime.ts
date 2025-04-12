import type { BRIDGE_MESSAGE_TYPE, BridgeRequest } from '@src/modules/extension-bridge';

export class Runtime {
  static sendMessage<TPayload, TResponse>(type: BRIDGE_MESSAGE_TYPE, payload?: TPayload): Promise<TResponse> {
    return chrome.runtime.sendMessage<BridgeRequest<TPayload>, TResponse>({
      type,
      payload,
    });
  }

  static onMessage<TPayload, TResponse>(
    type: BRIDGE_MESSAGE_TYPE,
    callback: (
      request: BridgeRequest<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: TResponse) => void,
    ) => void,
  ) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === type) {
        callback(request, sender, sendResponse);
      }
    });
  }

  static onMessageExternal<TPayload, TResponse>(
    type: BRIDGE_MESSAGE_TYPE,
    callback: (
      request: BridgeRequest<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: TResponse) => void,
    ) => void,
  ) {
    chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
      if (request.type === type) {
        callback(request, sender, sendResponse);
      }
    });
  }

  static async connect<TPayload>(
    type: BRIDGE_MESSAGE_TYPE,
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
