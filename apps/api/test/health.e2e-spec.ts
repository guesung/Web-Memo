import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";

describe("GET /health", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it("200과 상태 ok를 돌려준다", async () => {
		const response = await request(app.getHttpServer()).get("/health");

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("ok");
	});

	it("없는 경로는 404를 돌려준다", async () => {
		const response = await request(app.getHttpServer()).get("/nope");

		expect(response.status).toBe(404);
	});
});
