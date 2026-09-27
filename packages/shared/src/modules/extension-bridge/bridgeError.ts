/** 호출자가 복구 정책을 선택할 수 있는 브리지 실패 분류. */
export type TBridgeErrorCode =
	| "ExtensionUnavailable"
	| "Timeout"
	| "NoReceiver";

/** 전송 계층에서 확인한 브리지 오류. */
export class BridgeError extends Error {
	constructor(public readonly code: TBridgeErrorCode) {
		super(code);
		this.name = "BridgeError";
	}
}
