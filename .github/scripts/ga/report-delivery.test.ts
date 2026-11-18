// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishGaReport } from "./report-delivery.mjs";

const PAYLOAD = {
	text: "어제의 웹 메모",
	blocks: [{ type: "section", text: { type: "mrkdwn", text: "본문" } }],
};
const WEBHOOK_URL = "https://hooks.slack.com/services/x";

const jsonResponse = (body) => new Response(JSON.stringify(body));

const fetchMock = vi.fn();
let warnSpy;
let logSpy;

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
	warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	warnSpy.mockRestore();
	logSpy.mockRestore();
});

describe("publishGaReport", () => {
	it("봇 값이 있으면 GA_REPORT_CHANNEL_ID 채널에 봇으로 올리고 ts 를 돌려준다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: true, ts: "1.1" }));

		const delivery = await publishGaReport({
			payload: PAYLOAD,
			env: {
				SLACK_BOT_TOKEN: "xoxb-t",
				GA_REPORT_CHANNEL_ID: "C0CJ1031UAV",
				SLACK_REPORT_WEBHOOK_URL: WEBHOOK_URL,
			},
		});

		expect(delivery).toEqual({ via: "bot", ts: "1.1", channel: "C0CJ1031UAV" });
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).channel).toBe(
			"C0CJ1031UAV",
		);
	});

	it("봇 게시가 실패하면 웹훅으로 본문을 올린다", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ ok: false, error: "channel_not_found" }))
			.mockResolvedValueOnce(new Response("ok"));

		const delivery = await publishGaReport({
			payload: PAYLOAD,
			env: {
				SLACK_BOT_TOKEN: "xoxb-t",
				GA_REPORT_CHANNEL_ID: "C1",
				SLACK_REPORT_WEBHOOK_URL: WEBHOOK_URL,
			},
		});

		expect(delivery).toEqual({ via: "webhook" });
		expect(fetchMock.mock.calls[1][0]).toBe(WEBHOOK_URL);
	});

	it("봇 값이 없고 웹훅만 있으면 기존처럼 웹훅으로 올린다", async () => {
		fetchMock.mockResolvedValue(new Response("ok"));

		const delivery = await publishGaReport({
			payload: PAYLOAD,
			env: { SLACK_REPORT_WEBHOOK_URL: WEBHOOK_URL },
		});

		expect(delivery).toEqual({ via: "webhook" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("보낼 수단이 하나도 없으면 페이로드만 출력하고 아무것도 보내지 않는다", async () => {
		const delivery = await publishGaReport({ payload: PAYLOAD, env: {} });

		expect(delivery).toEqual({ via: "none" });
		expect(fetchMock).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(JSON.stringify(PAYLOAD, null, 2));
	});

	it("봇과 웹훅이 모두 실패하면 던져 잡을 실패시킨다", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ ok: false, error: "invalid_auth" }))
			.mockResolvedValueOnce(new Response("gone", { status: 410 }));

		await expect(
			publishGaReport({
				payload: PAYLOAD,
				env: {
					SLACK_BOT_TOKEN: "xoxb-t",
					GA_REPORT_CHANNEL_ID: "C1",
					SLACK_REPORT_WEBHOOK_URL: WEBHOOK_URL,
				},
			}),
		).rejects.toThrow("Slack 전송 실패");
	});

	it("웹훅 없이 봇만 실패해도 던진다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: false, error: "invalid_auth" }));

		await expect(
			publishGaReport({
				payload: PAYLOAD,
				env: { SLACK_BOT_TOKEN: "xoxb-t", GA_REPORT_CHANNEL_ID: "C1" },
			}),
		).rejects.toThrow("invalid_auth");
	});
});
