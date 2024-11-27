import { EXTERNAL_BRIDGE_TYPES_MAP, INTERNAL_BRIDGE_TYPES_MAP } from './constant';

export type ExternalBridgeType = (typeof EXTERNAL_BRIDGE_TYPES_MAP)[keyof typeof EXTERNAL_BRIDGE_TYPES_MAP];
export type InternalBridgeType = (typeof INTERNAL_BRIDGE_TYPES_MAP)[keyof typeof INTERNAL_BRIDGE_TYPES_MAP];
