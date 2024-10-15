import { EXTENSION_ID } from '@src/constants';
import { Runtime } from '../module';

export const BRIDGE_TYPE_GET_EXTENSION_MANIFEST = 'BRIDGE_TYPE_GET_EXTENSION_MANIFEST';
export const requestGetExtensionManifest = (callbackFn: (response: chrome.runtime.Manifest) => void) =>
  chrome.runtime.sendMessage(EXTENSION_ID, { type: BRIDGE_TYPE_GET_EXTENSION_MANIFEST }, callbackFn);
export const responseGetExtensionManifest = () => {
  const manifest = chrome.runtime.getManifest();
  Runtime.onMessageExternal(BRIDGE_TYPE_GET_EXTENSION_MANIFEST, (_, __, sendResponse) => sendResponse(manifest));
};
