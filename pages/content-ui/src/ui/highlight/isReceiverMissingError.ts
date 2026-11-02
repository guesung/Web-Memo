const RECEIVER_MISSING_MESSAGES = [
	"Could not establish connection",
	"Receiving end does not exist",
];

/** 확장 background와 연결되지 않아 메시지를 받을 쪽이 없는 오류인지 판별한다. */
export const isReceiverMissingError = (error: unknown): boolean => {
	if (typeof error !== "object" || error === null || !("message" in error)) {
		return false;
	}
	const { message } = error;

	return (
		typeof message === "string" &&
		RECEIVER_MISSING_MESSAGES.some((text) => message.includes(text))
	);
};
