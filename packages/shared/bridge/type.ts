import { BRIDGE_TYPE_SUMMARY } from './getSummary';
import { BRIDGE_TYPE_OPEN_SIDE_PANEL } from './openSidePanel';
import { BRIDGE_TYPE_PAGE_CONTENT } from './pageContent';

export type BridgeType =
  | typeof BRIDGE_TYPE_OPEN_SIDE_PANEL
  | typeof BRIDGE_TYPE_PAGE_CONTENT
  | typeof BRIDGE_TYPE_SUMMARY;
export interface BridgeRequest<T> {
  type: BridgeType;
  payload?: T;
}

export interface BridgeResponse {
  message: string;
}
