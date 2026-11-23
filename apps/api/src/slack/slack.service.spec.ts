import { SlackDeliveryError, SlackService } from "./slack.service.js";

describe("SlackService.send", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("200과 본문 ok면 성공한다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		await new SlackService().send("https://hooks.slack.test/x", "안녕");

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			text: "안녕",
		});
	});

	it("200이어도 본문이 ok가 아니면 실패로 본다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("no_service", { status: 200 })),
		);

		await expect(
			new SlackService().send("https://hooks.slack.test/x", "안녕"),
		).rejects.toThrow(SlackDeliveryError);
	});

	it("네트워크 오류·타임아웃도 SlackDeliveryError로 바꾼다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new Error("The operation was aborted")),
		);

		await expect(
			new SlackService().send("https://hooks.slack.test/x", "안녕"),
		).rejects.toThrow(/Slack 요청 실패/);
	});
});
