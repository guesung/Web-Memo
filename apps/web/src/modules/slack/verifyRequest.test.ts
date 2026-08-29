import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { verifySlackRequest } from "./verifyRequest";

const SIGNING_SECRET = "test-signing-secret";
const RAW_BODY = "payload=%7B%22type%22%3A%22block_actions%22%7D";

const sign = (timestamp: string, body = RAW_BODY, secret = SIGNING_SECRET) =>
	`v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;

const currentTimestamp = () => String(Math.floor(Date.now() / 1000));

describe("verifySlackRequest", () => {
	it("정상 서명을 통과시킨다", () => {
		const timestamp = currentTimestamp();

		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: sign(timestamp),
				timestamp,
				signingSecret: SIGNING_SECRET,
			}),
		).toEqual({ isValid: true, reason: null });
	});

	it("다른 시크릿으로 만든 서명을 거부한다", () => {
		const timestamp = currentTimestamp();

		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: sign(timestamp, RAW_BODY, "attacker-secret"),
				timestamp,
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(false);
	});

	it("본문이 바뀌면 거부한다", () => {
		const timestamp = currentTimestamp();

		expect(
			verifySlackRequest({
				rawBody: `${RAW_BODY}&tampered=1`,
				signature: sign(timestamp),
				timestamp,
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(false);
	});

	it("서명 헤더가 없으면 거부한다", () => {
		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: null,
				timestamp: currentTimestamp(),
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(false);
	});

	it("타임스탬프를 숫자로 읽을 수 없으면 거부한다", () => {
		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: sign("not-a-number"),
				timestamp: "not-a-number",
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(false);
	});

	// 서명이 유효해도 오래된 요청은 재전송 공격일 수 있습니다.
	it("5분보다 오래된 요청은 서명이 맞아도 거부한다", () => {
		const staleTimestamp = String(Math.floor(Date.now() / 1000) - 60 * 6);

		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: sign(staleTimestamp),
				timestamp: staleTimestamp,
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(false);
	});

	// 시계가 앞선 요청도 같은 허용 범위를 씁니다.
	it("미래로 5분 넘게 벗어난 요청도 거부한다", () => {
		const futureTimestamp = String(Math.floor(Date.now() / 1000) + 60 * 6);

		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: sign(futureTimestamp),
				timestamp: futureTimestamp,
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(false);
	});

	// 길이가 다른 문자열을 timingSafeEqual에 넣으면 예외가 납니다.
	it("길이가 다른 서명에도 예외 없이 false를 돌려준다", () => {
		const timestamp = currentTimestamp();

		expect(() =>
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: "v0=short",
				timestamp,
				signingSecret: SIGNING_SECRET,
			}),
		).not.toThrow();
	});

	it("경계값인 정확히 5분 전 요청은 통과시킨다", () => {
		vi.useFakeTimers();
		const timestamp = String(Math.floor(Date.now() / 1000));
		vi.advanceTimersByTime(60 * 5 * 1000);

		expect(
			verifySlackRequest({
				rawBody: RAW_BODY,
				signature: sign(timestamp),
				timestamp,
				signingSecret: SIGNING_SECRET,
			}).isValid,
		).toBe(true);

		vi.useRealTimers();
	});
});
