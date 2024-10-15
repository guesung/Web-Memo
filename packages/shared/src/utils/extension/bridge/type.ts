import { BRIDGE_TYPE_GET_EXTENSION_MANIFEST } from './getExtensionManifest';
import { BRIDGE_TYPE_GET_SUMMARY } from './getSummary';
import { BRIDGE_TYPE_OBSERVER_MEMO_PAGE } from './observeMemoPage';
import { BRIDGE_TYPE_OPEN_SIDE_PANEL } from './openSidePanel';
import { BRIDGE_TYPE_PAGE_CONTENT } from './pageContent';
import { BRIDGE_TYPE_REFETCH_THE_MEMO_LIST } from './refetchTheMemoList';
import { BRIDGE_TYPE_UPDATE_SIDE_PANEL } from './updateSidePanel';

export type BridgeType =
  | typeof BRIDGE_TYPE_OPEN_SIDE_PANEL
  | typeof BRIDGE_TYPE_PAGE_CONTENT
  | typeof BRIDGE_TYPE_GET_SUMMARY
  | typeof BRIDGE_TYPE_UPDATE_SIDE_PANEL
  | typeof BRIDGE_TYPE_OBSERVER_MEMO_PAGE
  | typeof BRIDGE_TYPE_REFETCH_THE_MEMO_LIST
  | typeof BRIDGE_TYPE_GET_EXTENSION_MANIFEST;
export interface BridgeRequest<T> {
  type: BridgeType;
  payload?: T;
}

export type BridgeResponse = string;
