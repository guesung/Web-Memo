import { BRIDGE_TYPE_OPEN_SIDE_PANEL, BRIDGE_TYPE_PAGE_CONTENT, BRIDGE_TYPE_SUMMARY } from '../constants';

export interface BridgeRequest {
  type: typeof BRIDGE_TYPE_PAGE_CONTENT | typeof BRIDGE_TYPE_SUMMARY | typeof BRIDGE_TYPE_OPEN_SIDE_PANEL;
  payload?: {
    content: string;
  };
}

export interface BridgeResponse {
  message: string;
}
