import { EXTENSION } from '@src/constants';

import { ExternalBridgeType, InternalBridgeType } from './type';

type MessageType<T> = {
  type: ExternalBridgeType | InternalBridgeType;
  payload: T;
};

export const requestToExtension = <TPayload = void, TResponse = void>(
  message: MessageType<TPayload>,
  callbackFn: Parameters<typeof chrome.runtime.sendMessage>[2],
) => chrome.runtime.sendMessage<MessageType<TPayload>, TResponse>(EXTENSION.id, message, callbackFn);

export const responseToWeb = (
  type: ExternalBridgeType,
  callbackFn: Parameters<typeof chrome.runtime.onMessage.addListener>[0],
) => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === type) callbackFn(message, sender, sendResponse);
  });
};

export const requestToExtensionInternal = (
  type: InternalBridgeType,
  callbackFn: Parameters<typeof chrome.runtime.sendMessage>[2],
) => {
  chrome.runtime.sendMessage(EXTENSION.id, { type }, callbackFn);
};

export const responseToExtensionInternal = (
  type: InternalBridgeType,
  callbackFn: Parameters<typeof chrome.runtime.onMessage.addListener>[0],
) => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === type) callbackFn(message, sender, sendResponse);
  });
};
