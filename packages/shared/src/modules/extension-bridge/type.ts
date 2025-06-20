import type { BRIDGE_MESSAGE_TYPES } from "./constant";

export type BRIDGE_MESSAGE_TYPE =
	(typeof BRIDGE_MESSAGE_TYPES)[keyof typeof BRIDGE_MESSAGE_TYPES];

export interface BridgeRequest<T> {
	type: BRIDGE_MESSAGE_TYPE;
	payload?: T;
}
