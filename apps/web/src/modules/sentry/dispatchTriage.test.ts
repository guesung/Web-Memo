import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchSentryTriage } from "./dispatchTriage";
import type { IFSentryIssueWebhookPayload } from "./request";

const slack = { channel: "C123", ts: "1700000000.000100" };

const buildPayload = (
	issue: Record<string, unknown> = {},
): IFSentryIssueWebhookPayload => ({
	action: "created",
	data: {
		issue: {
			id: "4567",
			shortId: "WEB-1",
			project: { slug: "web-memo-web" },
			...issue,
		},
	},
});

describe("dispatchSentryTriage", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("GITHUB_DISPATCH_TOKEN", "gh-token");
		vi.stubEnv("SLACK_BOT_TOKEN", "xoxb-test");
		vi.spyOn(console, "error").mockImplementation(() => {});
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("킬 스위치가 꺼져 있으면 아무 것도 호출하지 않는다", async () => {
		await dispatchSentryTriage({ payload: buildPayload(), slack });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('"true"가 아닌 값은 꺼짐으로 본다', async () => {
		vi.stubEnv("SENTRY_AI_TRIAGE_ENABLED", "1");

		await dispatchSentryTriage({ payload: buildPayload(), slack });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	describe("켜져 있을 때", () => {
		beforeEach(() => {
			vi.stubEnv("SENTRY_AI_TRIAGE_ENABLED", "true");
		});

		it("워크플로 입력 계약대로 master에 dispatch한다", async () => {
			fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

			await dispatchSentryTriage({ payload: buildPayload(), slack });

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [url, init] = fetchMock.mock.calls[0];

			expect(url).toBe(
				"https://api.github.com/repos/guesung/Web-Memo/actions/workflows/chore-sentry-triage.yml/dispatches",
			);
			expect(init.method).toBe("POST");
			expect(JSON.parse(init.body)).toEqual({
				ref: "master",
				inputs: {
					issue_id: "4567",
					short_id: "WEB-1",
					project_slug: "web-memo-web",
					action: "created",
					slack_channel: "C123",
					slack_ts: "1700000000.000100",
				},
			});
		});

		it.each(["abc", "12a", "", undefined])(
			"숫자가 아닌 issue id(%s)는 dispatch하지 않는다",
			async (id) => {
				await dispatchSentryTriage({
					payload: buildPayload({ id }),
					slack,
				});

				expect(fetchMock).not.toHaveBeenCalled();
			},
		);

		it("허용되지 않은 프로젝트는 dispatch하지 않는다", async () => {
			await dispatchSentryTriage({
				payload: buildPayload({ project: { slug: "other" } }),
				slack,
			});

			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("dispatch가 실패하면 던지지 않고 스레드에 답글을 단다", async () => {
			fetchMock
				.mockResolvedValueOnce(new Response("nope", { status: 422 }))
				.mockResolvedValueOnce(
					Response.json({ ok: true, channel: "C123", ts: "2" }),
				);

			await expect(
				dispatchSentryTriage({ payload: buildPayload(), slack }),
			).resolves.toBeUndefined();

			const [url, init] = fetchMock.mock.calls[1];

			expect(url).toBe("https://slack.com/api/chat.postMessage");
			expect(JSON.parse(init.body)).toEqual({
				channel: "C123",
				text: "AI 분석을 시작하지 못했습니다",
				thread_ts: "1700000000.000100",
			});
		});

		it("답글까지 실패해도 예외를 전파하지 않는다", async () => {
			fetchMock
				.mockRejectedValueOnce(new Error("network"))
				.mockRejectedValueOnce(new Error("slack down"));

			await expect(
				dispatchSentryTriage({ payload: buildPayload(), slack }),
			).resolves.toBeUndefined();
		});
	});
});
