import { BridgeRequest, BridgeType } from '../bridge';

export class Runtime {
  static sendMessage<TPayload, TResponse>(type: BridgeType, payload?: TPayload): Promise<TResponse> {
    return chrome.runtime.sendMessage<BridgeRequest<TPayload>, TResponse>({
      type,
      payload,
    });
  }

  static async onMessage<TPayload>(
    type: BridgeType,
    callbackFn: (
      request: BridgeRequest<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => void,
  ): Promise<void> {
    return chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request?.type || request.type !== type) return;
      callbackFn(request, sender, sendResponse);
    });
  }

  static async onMessageExternal<TPayload>(
    type: BridgeType,
    callbackFn?: (
      request: BridgeRequest<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => void,
  ): Promise<void> {
    return chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
      if (!request?.type || request.type !== type) return;
      callbackFn?.(request, sender, sendResponse);
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
