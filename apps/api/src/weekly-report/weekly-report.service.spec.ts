import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { signClickToken, signUnsubscribeToken } from "./report-token.js";
import { WeeklyReportService } from "./weekly-report.service.js";

const SECRET = "test-unsubscribe-secret-0123456789abcdef";
const WEB_URL = "https://www.webmemo.test";
const USER_ID = "11111111-2222-4333-8444-555555555555";

describe("WeeklyReportService", () => {
	let service: WeeklyReportService;
	const prisma = {
		weeklyReportClick: { create: vi.fn() },
		setting: { upsert: vi.fn() },
	};
	const env: Record<string, string | undefined> = {};

	beforeEach(async () => {
		prisma.weeklyReportClick.create.mockReset();
		prisma.setting.upsert.mockReset();
		Object.assign(env, { UNSUBSCRIBE_SECRET: SECRET, WEB_URL: `${WEB_URL}/` });

		// DB에 붙지 않도록 PrismaService 자리에 가짜를 넣는다. 서비스가 어떤 쿼리를 부르는지만 본다
		const moduleRef = await Test.createTestingModule({
			providers: [
				WeeklyReportService,
				{ provide: PrismaService, useValue: prisma },
				{
					provide: ConfigService,
					useValue: { get: (key: string) => env[key] },
				},
			],
		}).compile();

		service = moduleRef.get(WeeklyReportService);
	});

	const clickToken = (destination: string) =>
		signClickToken(
			{
				userId: USER_ID,
				weekStart: "2026-11-16",
				kind: "resurface",
				position: "memo-2",
				destination,
			},
			SECRET,
		);

	describe("recordClick", () => {
		it("유효한 토큰이면 클릭을 기록하고 목적지를 돌려준다", async () => {
			const destination = `${WEB_URL}/ko/memos?id=7`;

			await expect(service.recordClick(clickToken(destination))).resolves.toBe(
				destination,
			);
			expect(prisma.weeklyReportClick.create).toHaveBeenCalledWith({
				data: {
					userId: USER_ID,
					weekStart: new Date("2026-11-16T00:00:00.000Z"),
					kind: "resurface",
					position: "memo-2",
				},
			});
		});

		it("토큰이 틀리면 기록하지 않고 웹 홈을 돌려준다", async () => {
			await expect(service.recordClick("broken.token")).resolves.toBe(WEB_URL);
			await expect(service.recordClick(undefined)).resolves.toBe(WEB_URL);
			expect(prisma.weeklyReportClick.create).not.toHaveBeenCalled();
		});

		it("서명이 맞아도 목적지가 웹 도메인이 아니면 기록하지 않고 웹 홈을 돌려준다", async () => {
			await expect(
				service.recordClick(clickToken("https://evil.test/")),
			).resolves.toBe(WEB_URL);
			expect(prisma.weeklyReportClick.create).not.toHaveBeenCalled();
		});

		it("기록이 실패해도 목적지는 돌려준다", async () => {
			const destination = `${WEB_URL}/ko/memos`;
			prisma.weeklyReportClick.create.mockRejectedValue(
				new Error("connection refused"),
			);

			await expect(service.recordClick(clickToken(destination))).resolves.toBe(
				destination,
			);
		});

		it("WEB_URL이 없으면 운영 주소를 기준으로 삼는다", async () => {
			env.WEB_URL = undefined;

			await expect(service.recordClick("broken.token")).resolves.toBe(
				"https://www.webmemo.xyz",
			);
		});
	});

	describe("unsubscribe", () => {
		it("유효한 토큰이면 설정을 수신 거부로 upsert한다", async () => {
			await expect(
				service.unsubscribe(signUnsubscribeToken(USER_ID, SECRET)),
			).resolves.toBe(true);
			expect(prisma.setting.upsert).toHaveBeenCalledWith({
				where: { userId: USER_ID },
				create: { userId: USER_ID, weeklyReportEnabled: false },
				update: { weeklyReportEnabled: false },
			});
		});

		it("토큰이 틀리면 DB를 건드리지 않고 false를 돌려준다", async () => {
			await expect(service.unsubscribe(`${USER_ID}.wrong`)).resolves.toBe(
				false,
			);
			await expect(service.unsubscribe(null)).resolves.toBe(false);
			expect(prisma.setting.upsert).not.toHaveBeenCalled();
		});

		it("저장이 실패하면 예외를 그대로 던진다", async () => {
			prisma.setting.upsert.mockRejectedValue(new Error("connection refused"));

			await expect(
				service.unsubscribe(signUnsubscribeToken(USER_ID, SECRET)),
			).rejects.toThrow("connection refused");
		});
	});
});
