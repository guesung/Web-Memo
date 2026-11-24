import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { signClickToken, signUnsubscribeToken } from "../src/weekly-report/report-token.js";
import { TEST_ENV } from "./testEnv.js";

const USER_ID = "11111111-2222-4333-8444-555555555555";

describe("주간 리포트 메일 링크", () => {
	let app: INestApplication;
	const prisma = {
		weeklyReportClick: { create: vi.fn() },
		setting: { upsert: vi.fn() },
	};

	beforeAll(async () => {
		// 실제 DB에 붙지 않게 PrismaService만 가짜로 바꾼다. 라우팅·본문 파싱·토큰 검증은 진짜다
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(PrismaService)
			.useValue(prisma)
			.compile();

		app = moduleRef.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		prisma.weeklyReportClick.create.mockReset();
		prisma.setting.upsert.mockReset();
	});

	describe("GET /weekly-report/click", () => {
		const destination = `${TEST_ENV.WEB_URL}/ko/memos?id=1`;
		const token = signClickToken(
			{ userId: USER_ID, weekStart: "2026-11-16", kind: "report", position: "memo-1", destination },
			TEST_ENV.UNSUBSCRIBE_SECRET,
		);

		it("유효한 토큰이면 클릭을 기록하고 목적지로 302한다", async () => {
			const response = await request(app.getHttpServer()).get("/weekly-report/click").query({ t: token });

			expect(response.status).toBe(302);
			expect(response.headers.location).toBe(destination);
			expect(response.headers["cache-control"]).toBe("no-store");
			expect(prisma.weeklyReportClick.create).toHaveBeenCalledTimes(1);
		});

		it("토큰이 없거나 틀리면 기록 없이 웹 홈으로 302한다", async () => {
			const missing = await request(app.getHttpServer()).get("/weekly-report/click");
			const broken = await request(app.getHttpServer()).get("/weekly-report/click").query({ t: "a.b" });

			expect(missing.status).toBe(302);
			expect(missing.headers.location).toBe(TEST_ENV.WEB_URL);
			expect(broken.headers.location).toBe(TEST_ENV.WEB_URL);
			expect(prisma.weeklyReportClick.create).not.toHaveBeenCalled();
		});

		it("메일 스캐너의 HEAD 요청은 클릭으로 세지 않는다", async () => {
			const response = await request(app.getHttpServer()).head("/weekly-report/click").query({ t: token });

			expect(response.status).toBe(302);
			expect(response.headers.location).toBe(TEST_ENV.WEB_URL);
			expect(prisma.weeklyReportClick.create).not.toHaveBeenCalled();
		});

		it("DB 기록이 실패해도 목적지로 보낸다", async () => {
			prisma.weeklyReportClick.create.mockRejectedValue(new Error("db down"));

			const response = await request(app.getHttpServer()).get("/weekly-report/click").query({ t: token });

			expect(response.status).toBe(302);
			expect(response.headers.location).toBe(destination);
		});
	});

	describe("POST /weekly-report/unsubscribe", () => {
		const token = signUnsubscribeToken(USER_ID, TEST_ENV.UNSUBSCRIBE_SECRET);

		it("JSON 본문의 토큰으로 수신 거부한다", async () => {
			const response = await request(app.getHttpServer()).post("/weekly-report/unsubscribe").send({ token });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ status: "ok" });
			expect(response.headers["access-control-allow-origin"]).toBe("*");
			expect(prisma.setting.upsert).toHaveBeenCalledTimes(1);
		});

		it("메일 클라이언트의 One-Click(form 본문 + 쿼리 토큰)으로 수신 거부한다", async () => {
			const response = await request(app.getHttpServer())
				.post("/weekly-report/unsubscribe")
				.query({ token })
				.type("form")
				.send("List-Unsubscribe=One-Click");

			expect(response.status).toBe(200);
			expect(prisma.setting.upsert).toHaveBeenCalledTimes(1);
		});

		it("토큰이 틀리면 401, DB를 건드리지 않는다", async () => {
			const response = await request(app.getHttpServer())
				.post("/weekly-report/unsubscribe")
				.send({ token: `${USER_ID}.wrong` });

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ error: "invalid_token" });
			expect(prisma.setting.upsert).not.toHaveBeenCalled();
		});

		it("One-Click 표시가 없는 form 본문이나 다른 본문 형식은 400", async () => {
			const form = await request(app.getHttpServer())
				.post("/weekly-report/unsubscribe")
				.query({ token })
				.type("form")
				.send("foo=bar");
			const text = await request(app.getHttpServer())
				.post("/weekly-report/unsubscribe")
				.type("text/plain")
				.send(token);

			expect(form.status).toBe(400);
			expect(form.body).toEqual({ error: "bad_request" });
			expect(text.status).toBe(400);
			expect(prisma.setting.upsert).not.toHaveBeenCalled();
		});

		it("저장이 실패하면 500", async () => {
			prisma.setting.upsert.mockRejectedValue(new Error("db down"));

			const response = await request(app.getHttpServer()).post("/weekly-report/unsubscribe").send({ token });

			expect(response.status).toBe(500);
			expect(response.body).toEqual({ error: "internal_error" });
		});

		it("브라우저 사전 요청(OPTIONS)에 CORS 헤더로 답한다", async () => {
			const response = await request(app.getHttpServer()).options("/weekly-report/unsubscribe");

			expect(response.status).toBe(204);
			expect(response.headers["access-control-allow-origin"]).toBe("*");
			expect(response.headers["access-control-allow-headers"]).toBe("content-type");
		});
	});
});
