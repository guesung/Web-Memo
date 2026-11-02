import { describe, expect, it } from "vitest";
import { isReceiverMissingError } from "./isReceiverMissingError";

describe("isReceiverMissingError", () => {
	it.each([
		"Could not establish connection. Receiving end does not exist.",
		"Could not establish connection",
		"Receiving end does not exist.",
	])("수신자 부재 메시지 %s는 true", (message) => {
		expect(isReceiverMissingError(new Error(message))).toBe(true);
	});

	it("채널이 먼저 닫힌 오류는 false", () => {
		expect(
			isReceiverMissingError(
				new Error(
					"A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
				),
			),
		).toBe(false);
	});

	it.each([
		undefined,
		null,
		"Receiving end does not exist",
		1,
		{},
		{ message: 1 },
	])("Error가 아니거나 message가 문자열이 아니면 false (%o)", (value) => {
		expect(isReceiverMissingError(value)).toBe(false);
	});
});
