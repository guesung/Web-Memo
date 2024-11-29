import { EXTENSION } from '@src/constants';

import { Runtime } from '../module';

export const BRIDGE_TYPE_REFETCH_THE_MEMO_LIST = 'BRIDGE_TYPE_REFETCH_THE_MEMO_LIST';
export const requestRefetchTheMemos = () =>
  chrome.runtime.sendMessage(EXTENSION.id, { type: BRIDGE_TYPE_REFETCH_THE_MEMO_LIST });
export const responseRefetchTheMemos = (callbackFn: () => void) =>
  Runtime.onMessageExternal(BRIDGE_TYPE_REFETCH_THE_MEMO_LIST, callbackFn);
