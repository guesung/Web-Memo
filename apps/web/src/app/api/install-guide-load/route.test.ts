import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { config, afterTasks } = vi.hoisted(() => ({
	config: { buildEnv: "production" },
	afterTasks: [] as Array<() => unknown>,
}));

vi.mock("@web-memo/env", () => ({ CONFIG: config }));
vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: (task: () => unknown) => {
		afterTasks.push(task);
	},
}));

import { POST } from "./route";

const beaconWith = (body: string) =>
	new NextRequest("https://webmemo.example/api/install-guide-load", {
		method: "POST",
		headers: { "Content-Type": "text/plain;charset=UTF-8" },
		body,
	});

/** `after()`로 예약된 작업을 응답 뒤에 실행된 것처럼 돌립니다. */
const runAfterTasks = async () => {
	for (const task of afterTasks.splice(0)) await task();
};

const readEvent = () => {
	const [, options] = vi.mocked(fetch).mock.calls[0];
	return JSON.parse(options?.body as string) as {
		client_id: string;
		events: Array<{ name: string; params: Record<string, unknown> }>;
	};
};

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("POST /api/install-guide-load", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		afterTasks.length = 0;
		config.buildEnv = "production";
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, status: 204 }),
		);
	});

	it("GA 전송 전에 204로 응답하고, 응답 뒤에 install_guide_load를 한 번 보낸다", async () => {
		vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
		const clientId = "550e8400-e29b-41d4-a716-446655440000";

		const response = await POST(beaconWith(JSON.stringify({ cid: clientId })));

		expect(response.status).toBe(204);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(fetch).not.toHaveBeenCalled();
		expect(afterTasks).toHaveLength(1);

		void runAfterTasks();
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
		expect(readEvent()).toEqual({
			client_id: clientId,
			events: [
				{
					name: "install_guide_load",
					params: {
						event_category: "engagement",
						engagement_time_msec: 100,
						session_id: expect.any(String),
						build_env: "production",
					},
				},
			],
		});
	});

	it("session 형식의 cid도 그대로 쓰고 staging에서는 디버그 모드를 켠다", async () => {
		config.buildEnv = "staging";
		await POST(
			beaconWith(JSON.stringify({ cid: "session-1712345678901-a1b2c3d4e" })),
		);
		await runAfterTasks();

		expect(readEvent().client_id).toBe("session-1712345678901-a1b2c3d4e");
		expect(readEvent().events[0].params).toMatchObject({
			build_env: "staging",
			debug_mode: true,
		});
	});

	it.each([
		["cid 없음", JSON.stringify({})],
		["잘못된 cid", JSON.stringify({ cid: "private@email.test" })],
		["문자열이 아닌 cid", JSON.stringify({ cid: 123 })],
		["JSON이 아닌 본문", "not-json"],
		["빈 본문", ""],
		["너무 긴 본문", JSON.stringify({ cid: "x".repeat(300) })],
	])("%s이면 새 UUID로 보낸다", async (_, body) => {
		const response = await POST(beaconWith(body));
		await runAfterTasks();

		expect(response.status).toBe(204);
		expect(fetch).toHaveBeenCalledOnce();
		expect(readEvent().client_id).toMatch(UUID_PATTERN);
		expect(readEvent().events[0].name).toBe("install_guide_load");
	});

	it("GA 전송이 실패해도 던지지 않는다", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.mocked(fetch).mockRejectedValue(new Error("network"));

		const response = await POST(beaconWith("{}"));

		expect(response.status).toBe(204);
		await expect(runAfterTasks()).resolves.toBeUndefined();
	});

	it("development에서는 GA를 호출하지 않는다", async () => {
		config.buildEnv = "development";
		const response = await POST(beaconWith("{}"));
		await runAfterTasks();

		expect(response.status).toBe(204);
		expect(fetch).not.toHaveBeenCalled();
	});
});
