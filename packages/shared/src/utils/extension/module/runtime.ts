import { BridgeRequest, BridgeResponse, BridgeType } from '../bridge';

// ref : https://developer.chrome.com/docs/extensions/reference/api/runtime
export class Runtime {
  /**
   *
   * @param type bridge type
   * @param payload bridge request
   * @returns Nothing
   */
  static sendMessage<TPayload>(type: BridgeType, payload?: TPayload): Promise<BridgeResponse> {
    return chrome.runtime.sendMessage<BridgeRequest<TPayload>, BridgeResponse>({
      type,
      payload,
    });
  }

  /**
   *
   * @param type : bridge type
   * @param callbackFn : bridge response
   * @returns Nothing
   */
  static async onMessage<TPayload>(
    type: BridgeType,
    callbackFn: (
      request: BridgeRequest<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: string) => void,
    ) => void,
  ): Promise<void> {
    return chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request?.type || request.type !== type) return;
      callbackFn(request, sender, sendResponse);
    });
  }

  /**
   *
   * @param type : bridge type
   * @param callbackFn : bridge response
   * @returns Nothing
   */
  static async onMessageExternal<TPayload>(
    type: BridgeType,
    callbackFn: (
      request: BridgeRequest<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: string) => void,
    ) => void,
  ): Promise<void> {
    return chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
      if (!request?.type || request.type !== type) return;
      callbackFn(request, sender, sendResponse);
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
