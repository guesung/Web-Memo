import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	postSlackMessage,
	readSlackEnv,
	sendSlackMessage,
} from "./slack-api.mjs";

const PAYLOAD = {
	text: "미리보기",
	blocks: [{ type: "section", text: { type: "mrkdwn", text: "본문" } }],
};

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status });

const fetchMock = vi.fn();
let warnSpy: ReturnType<typeof vi.spyOn>;

const warnings = () => warnSpy.mock.calls.map((call) => String(call[0]));

const requestBody = (callIndex = 0) =>
	JSON.parse(fetchMock.mock.calls[callIndex][1].body);

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
	warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	warnSpy.mockRestore();
});

describe("postSlackMessage", () => {
	it("chat.postMessage로 Bearer 토큰과 함께 보낸다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: true, ts: "1.1" }));

		await postSlackMessage({ token: "xoxb-t", channel: "C1", payload: PAYLOAD });

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe("https://slack.com/api/chat.postMessage");
		expect(options.method).toBe("POST");
		expect(options.headers.authorization).toBe("Bearer xoxb-t");
	});

	it("본문에 channel, text, blocks, unfurl_links:false가 들어가고 루트에는 thread_ts가 없다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: true, ts: "1.1" }));

		const result = await postSlackMessage({
			token: "xoxb-t",
			channel: "C1",
			payload: PAYLOAD,
		});

		expect(requestBody()).toEqual({
			channel: "C1",
			text: PAYLOAD.text,
			blocks: PAYLOAD.blocks,
			unfurl_links: false,
		});
		expect(requestBody()).not.toHaveProperty("thread_ts");
		expect(result).toEqual({ ok: true, ts: "1.1" });
	});

	it("댓글 호출에는 루트 ts가 thread_ts로 들어간다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: true, ts: "2.2" }));

		await postSlackMessage({
			token: "xoxb-t",
			channel: "C1",
			payload: PAYLOAD,
			threadTs: "1.1",
		});

		expect(requestBody().thread_ts).toBe("1.1");
	});

	it("HTTP 200이어도 ok:false면 Slack의 error를 담아 실패로 돌려주고 던지지 않는다", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ ok: false, error: "channel_not_found" }),
		);

		const result = await postSlackMessage({
			token: "t",
			channel: "C1",
			payload: PAYLOAD,
		});

		expect(result).toEqual({ ok: false, error: "channel_not_found" });
	});

	it("HTTP 오류는 상태 코드를 error로 돌려준다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}, 500));

		const result = await postSlackMessage({
			token: "t",
			channel: "C1",
			payload: PAYLOAD,
		});

		expect(result).toEqual({ ok: false, error: "http_500" });
	});

	it("ok:true인데 ts가 없으면 실패로 다룬다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

		const result = await postSlackMessage({
			token: "t",
			channel: "C1",
			payload: PAYLOAD,
		});

		expect(result).toEqual({ ok: false, error: "missing_ts" });
	});

	it("네트워크 오류도 던지지 않고 실패로 돌려준다", async () => {
		fetchMock.mockRejectedValue(new Error("ECONNRESET"));

		const result = await postSlackMessage({
			token: "t",
			channel: "C1",
			payload: PAYLOAD,
		});

		expect(result.ok).toBe(false);
		expect(result).toMatchObject({ error: expect.stringContaining("ECONNRESET") });
	});
});

describe("sendSlackMessage", () => {
	const fullSlack = {
		botToken: "xoxb-t",
		channelId: "C1",
		threadTs: "1.1",
		webhookUrl: "https://hooks.slack.com/services/x",
	};

	it("토큰·채널·ts가 모두 있으면 스레드 댓글로 보낸다", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ ok: true, ts: "2.2" }));

		const result = await sendSlackMessage({ payload: PAYLOAD, slack: fullSlack });

		expect(result).toEqual({ ok: true, via: "thread", ts: "2.2" });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe(
			"https://slack.com/api/chat.postMessage",
		);
		expect(requestBody().thread_ts).toBe("1.1");
		expect(warnings()).toEqual([]);
	});

	it("토큰이 없으면 경고를 남기고 웹훅 최상위 메시지로 보낸다", async () => {
		fetchMock.mockResolvedValue(new Response("ok"));

		const result = await sendSlackMessage({
			payload: PAYLOAD,
			slack: { ...fullSlack, botToken: "" },
		});

		expect(result).toEqual({ ok: true, via: "webhook" });
		expect(fetchMock.mock.calls[0][0]).toBe(fullSlack.webhookUrl);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(PAYLOAD);
		expect(warnings()).toEqual([
			expect.stringMatching(/^::warning::SLACK_BOT_TOKEN /),
		]);
	});

	it("채널이 없으면 경고를 남기고 웹훅으로 보낸다", async () => {
		fetchMock.mockResolvedValue(new Response("ok"));

		const result = await sendSlackMessage({
			payload: PAYLOAD,
			slack: { ...fullSlack, channelId: "" },
		});

		expect(result.via).toBe("webhook");
		expect(warnings()[0]).toContain("SLACK_CHANNEL_ID");
	});

	it("루트 ts가 비면 경고를 남기고 웹훅으로 보낸다", async () => {
		fetchMock.mockResolvedValue(new Response("ok"));

		const result = await sendSlackMessage({
			payload: PAYLOAD,
			slack: { ...fullSlack, threadTs: "" },
		});

		expect(result.via).toBe("webhook");
		expect(fetchMock.mock.calls[0][0]).toBe(fullSlack.webhookUrl);
		expect(warnings()[0]).toContain("ts");
	});

	it("스레드 전송이 ok:false면 error를 경고에 담고 웹훅으로 내려간다", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ ok: false, error: "invalid_auth" }))
			.mockResolvedValueOnce(new Response("ok"));

		const result = await sendSlackMessage({ payload: PAYLOAD, slack: fullSlack });

		expect(result).toEqual({ ok: true, via: "webhook" });
		expect(warnings()).toEqual([expect.stringContaining("invalid_auth")]);
		expect(fetchMock.mock.calls[1][0]).toBe(fullSlack.webhookUrl);
	});

	it("웹훅도 없으면 경고만 남기고 던지지 않는다", async () => {
		const result = await sendSlackMessage({
			payload: PAYLOAD,
			slack: { ...fullSlack, botToken: "", webhookUrl: "" },
		});

		expect(result).toEqual({ ok: false, via: "none" });
		expect(fetchMock).not.toHaveBeenCalled();
		expect(warnings()).toHaveLength(2);
	});

	it("웹훅 전송이 실패해도 던지지 않고 경고를 남긴다", async () => {
		fetchMock.mockResolvedValue(new Response("no_service", { status: 404 }));

		const result = await sendSlackMessage({
			payload: PAYLOAD,
			slack: { ...fullSlack, threadTs: "" },
		});

		expect(result).toEqual({ ok: false, via: "none" });
		expect(warnings().some((line) => line.includes("404"))).toBe(true);
	});

	it("경고에 개행이 있어도 한 줄로 남기고 토큰은 싣지 않는다", async () => {
		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({ ok: false, error: "bad\n::error::injected" }),
			)
			.mockResolvedValueOnce(new Response("ok"));

		await sendSlackMessage({ payload: PAYLOAD, slack: fullSlack });

		for (const line of warnings()) {
			expect(line).not.toMatch(/[\r\n]/);
			expect(line).not.toContain("xoxb-t");
		}
	});
});

describe("readSlackEnv", () => {
	it("빈 문자열과 없는 값을 모두 빈 문자열로 읽는다", () => {
		expect(
			readSlackEnv({ SLACK_BOT_TOKEN: "", SLACK_THREAD_TS: "1.1" }),
		).toEqual({
			botToken: "",
			channelId: "",
			threadTs: "1.1",
			webhookUrl: "",
		});
	});
});
