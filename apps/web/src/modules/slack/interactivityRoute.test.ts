import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	installFakeFetch,
	MASTER_SHA,
	MERGE_SHA,
	RESPONSE_URL,
} from "./nextVersionPr.testHelpers";

// 서명 검증은 verifyRequest.test.ts가 다룬다. 여기서는 payload 분기만 본다.
vi.mock("@src/modules/slack/request", () => ({
	readVerifiedSlackForm: async (request: { payload: string }) =>
		new URLSearchParams({ payload: request.payload }),
}));

import { POST } from "@src/app/api/slack/interactivity/route";

const post = (payload: unknown) =>
	POST({ payload: JSON.stringify(payload) } as never);

const bumpPayload = {
	type: "block_actions",
	response_url: RESPONSE_URL,
	trigger_id: "T1",
	user: { id: "U1" },
	actions: [
		{
			action_id: "deploy_bump_extension",
			type: "static_select",
			selected_option: {
				value: JSON.stringify({
					target: "extension",
					ref: MASTER_SHA,
					bump: "patch",
					version: "1.11.6",
				}),
			},
		},
	],
};

describe("/api/slack/interactivity 버전 올려 배포 분기", () => {
	beforeEach(() => {
		vi.stubEnv("GITHUB_DISPATCH_TOKEN", "test-token");
		vi.stubEnv("SLACK_BOT_TOKEN", "xoxb-test");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("deploy_bump_*는 즉시 배포 경로로 빠지지 않고 머지 커밋으로 배포한다", async () => {
		const fake = installFakeFetch();

		const response = await post(bumpPayload);

		expect(response.status).toBe(200);
		// 즉시 배포 경로였다면 선택 전의 master SHA로 dispatch했을 것이다
		expect(fake.dispatches()).toHaveLength(1);
		expect(
			(fake.dispatches()[0].body as { inputs: { ref: string } }).inputs.ref,
		).toBe(MERGE_SHA);
		expect(fake.calls.some((call) => call.method === "PUT")).toBe(true);
	});

	it("게이트에서 반려되면 200으로 ack하고 GitHub 쓰기·dispatch가 없다", async () => {
		const fake = installFakeFetch();
		const stale = structuredClone(bumpPayload);

		stale.actions[0].selected_option.value = JSON.stringify({
			target: "extension",
			ref: "c".repeat(40),
			bump: "patch",
			version: "1.11.6",
		});

		const response = await post(stale);

		expect(response.status).toBe(200);
		expect(fake.writes()).toEqual([]);
		expect(fake.dispatches()).toHaveLength(0);
	});

	it("깨진 value는 본인에게만 오류를 알리고 아무것도 배포하지 않는다", async () => {
		const fake = installFakeFetch();
		const broken = structuredClone(bumpPayload);

		broken.actions[0].selected_option.value = "not json";

		await post(broken);

		expect(fake.dispatches()).toHaveLength(0);
		expect(fake.slackTexts().at(-1)?.response_type).toBe("ephemeral");
	});

	it("기존 deploy_custom은 계속 모달을 연다", async () => {
		const fake = installFakeFetch();

		const response = await post({
			type: "block_actions",
			response_url: RESPONSE_URL,
			trigger_id: "T1",
			user: { id: "U1" },
			actions: [
				{
					action_id: "deploy_custom",
					value: JSON.stringify({ ref: MASTER_SHA, target: "extension" }),
				},
			],
		});

		expect(response.status).toBe(200);
		expect(fake.calls.some((call) => call.path === "/api/views.open")).toBe(
			true,
		);
		expect(fake.dispatches()).toHaveLength(0);
	});

	it("기존 deploy_<대상> 버튼은 계속 즉시 배포한다", async () => {
		const fake = installFakeFetch();

		await post({
			type: "block_actions",
			response_url: RESPONSE_URL,
			user: { id: "U1" },
			actions: [
				{
					action_id: "deploy_extension",
					value: JSON.stringify({ target: "extension", ref: MASTER_SHA }),
				},
			],
		});

		expect(fake.dispatches()).toHaveLength(1);
		expect(
			(fake.dispatches()[0].body as { inputs: { ref: string } }).inputs.ref,
		).toBe(MASTER_SHA);
		expect(fake.calls.some((call) => call.method === "PUT")).toBe(false);
	});
});
