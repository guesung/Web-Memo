import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { WEBHOOK_SECRET_HEADER } from "../src/webhook/webhook-secret.guard.js";
import { SlackDeliveryError, SlackService } from "../src/slack/slack.service.js";
import { TEST_ENV } from "./testEnv.js";

describe("웹훅 엔드포인트", () => {
	let app: INestApplication;
	const slack = { send: vi.fn() };

	beforeAll(async () => {
		// 실제 Slack으로 보내지 않게 SlackService만 가짜로 바꾼다. 나머지(가드·검증·필터)는 진짜다
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(SlackService)
			.useValue(slack)
			.compile();

		app = moduleRef.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		slack.send.mockReset();
	});

	const feedbackBody = {
		type: "INSERT",
		table: "feedbacks",
		schema: "feedback",
		old_record: null,
		record: {
			id: 42,
			content: "검색이 느려요",
			user_id: null,
			email: null,
			created_at: "2026-11-23T06:00:00.000Z",
		},
	};

	const post = (path: string, body: object, secret: string | null = TEST_ENV.WEBHOOK_SECRET) => {
		const req = request(app.getHttpServer()).post(path);

		return secret === null ? req.send(body) : req.set(WEBHOOK_SECRET_HEADER, secret).send(body);
	};

	describe("POST /webhooks/feedback", () => {
		it("비밀 헤더가 없거나 틀리면 401이고 Slack을 부르지 않는다", async () => {
			expect((await post("/webhooks/feedback", feedbackBody, null)).status).toBe(401);
			expect((await post("/webhooks/feedback", feedbackBody, "wrong")).status).toBe(401);
			expect(slack.send).not.toHaveBeenCalled();
		});

		it("record 형식이 틀리면 400이고 Slack을 부르지 않는다", async () => {
			const response = await post("/webhooks/feedback", {
				record: { ...feedbackBody.record, id: "not-a-number", content: "" },
			});

			expect(response.status).toBe(400);
			expect(slack.send).not.toHaveBeenCalled();
		});

		it("올바른 웹훅이면 피드백 채널로 보내고 200을 돌려준다", async () => {
			const response = await post("/webhooks/feedback", feedbackBody);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ status: "success" });
			expect(slack.send).toHaveBeenCalledWith(
				TEST_ENV.SLACK_FEEDBACK_WEBHOOK_URL,
				expect.stringContaining("검색이 느려요"),
			);
		});

		it("DB 트리거가 보내는 실제 형식(숫자 id·마이크로초·+00:00 시각·추가 컬럼)을 받는다", async () => {
			const response = await post("/webhooks/feedback", {
				record: {
					id: 1234,
					created_at: "2026-11-23T07:30:00.123456+00:00",
					content: "실제 형식",
					user_id: "1b0e4a52-3f8d-4c62-9f7e-6a1d2c3b4e5f",
					email: null,
					source_path: "/ko/memos",
				},
			});

			expect(response.status).toBe(200);
		});

		it("Slack 전송이 실패하면 502를 돌려준다", async () => {
			slack.send.mockRejectedValue(new SlackDeliveryError("Slack 전송 실패 — status 404"));

			expect((await post("/webhooks/feedback", feedbackBody)).status).toBe(502);
		});
	});

	describe("POST /webhooks/signup", () => {
		const signupBody = {
			record: { id: "1b0e4a52-3f8d-4c62-9f7e-6a1d2c3b4e5f", created_at: "2026-11-23T06:00:00.000Z" },
		};

		it("올바른 요청이면 가입 채널로 보낸다", async () => {
			const response = await post("/webhooks/signup", signupBody);

			expect(response.status).toBe(200);
			expect(slack.send).toHaveBeenCalledWith(
				TEST_ENV.SLACK_SIGNUP_WEBHOOK_URL,
				`:tada: 신규 가입\nuser ${signupBody.record.id} · ${signupBody.record.created_at}`,
			);
		});

		it("비밀 헤더가 틀리면 401이다", async () => {
			expect((await post("/webhooks/signup", signupBody, "wrong")).status).toBe(401);
		});
	});
});
