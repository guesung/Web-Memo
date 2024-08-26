import { BRIDGE_TYPE_PAGE_CONTENT, BRIDGE_TYPE_SUMMARY } from '../constants';

export interface BridgeRequest {
  type: typeof BRIDGE_TYPE_PAGE_CONTENT | typeof BRIDGE_TYPE_SUMMARY;
  payload?: {
    content: string;
  };
}

export interface BridgeResponse {
  message: string;
}
