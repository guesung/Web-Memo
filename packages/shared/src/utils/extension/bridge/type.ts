import { BRIDGE_TYPE_GET_EXTENSION_MANIFEST } from './getExtensionManifest';
import { BRIDGE_TYPE_GET_SIDE_PANEL_OPEN } from './getSidePanelOpen';
import { BRIDGE_TYPE_GET_SUMMARY } from './getSummary';
import { BRIDGE_TYPE_GET_TABS } from './getTabs';
import { BRIDGE_TYPE_OBSERVER_MEMO_PAGE } from './observeMemoPage';
import { BRIDGE_TYPE_OPEN_SIDE_PANEL } from './openSidePanel';
import { BRIDGE_TYPE_PAGE_CONTENT } from './pageContent';
import { BRIDGE_TYPE_REFETCH_THE_MEMO_LIST } from './refetchTheMemos';
import { BRIDGE_TYPE_UPDATE_SIDE_PANEL } from './updateSidePanel';

export type BridgeType =
  | typeof BRIDGE_TYPE_OPEN_SIDE_PANEL
  | typeof BRIDGE_TYPE_PAGE_CONTENT
  | typeof BRIDGE_TYPE_GET_SUMMARY
  | typeof BRIDGE_TYPE_UPDATE_SIDE_PANEL
  | typeof BRIDGE_TYPE_OBSERVER_MEMO_PAGE
  | typeof BRIDGE_TYPE_REFETCH_THE_MEMO_LIST
  | typeof BRIDGE_TYPE_GET_EXTENSION_MANIFEST
  | typeof BRIDGE_TYPE_GET_SIDE_PANEL_OPEN
  | typeof BRIDGE_TYPE_GET_TABS;
export interface BridgeRequest<T> {
  type: BridgeType;
  payload?: T;
}
