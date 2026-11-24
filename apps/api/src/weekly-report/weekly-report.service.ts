import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { verifyClickToken, verifyUnsubscribeToken } from "./report-token.js";
import { isWebUrlDestination } from "./web-url.js";

/** WEB_URL이 없을 때 보내는 곳. 메일 링크가 갈 곳을 잃지 않게 운영 주소를 기본값으로 둔다 */
const DEFAULT_WEB_URL = "https://www.webmemo.xyz";

@Injectable()
export class WeeklyReportService {
	private readonly logger = new Logger(WeeklyReportService.name);

	constructor(
		private readonly config: ConfigService<Env, true>,
		private readonly prisma: PrismaService,
	) {}

	/** 웹 앱 주소(끝 슬래시 제거). 토큰이 틀렸을 때 보내는 곳이자 목적지 허용 판정의 기준 */
	get webUrl() {
		return (
			this.config.get("WEB_URL", { infer: true }) ?? DEFAULT_WEB_URL
		).replace(/\/+$/, "");
	}

	/**
	 * 메일 링크 클릭을 기록하고, 보낼 목적지를 돌려준다.
	 * @description 서명이 틀리거나 목적지가 웹 도메인이 아니면 기록 없이 웹 홈을 돌려준다(오픈 리다이렉트 금지).
	 * 기록이 실패해도 목적지는 돌려준다 — 메일 링크가 죽으면 안 된다.
	 */
	async recordClick(token: string | undefined) {
		const payload = verifyClickToken(token, this.tokenSecret);

		if (!payload || !isWebUrlDestination(payload.destination, this.webUrl)) {
			return this.webUrl;
		}

		try {
			await this.prisma.weeklyReportClick.create({
				data: {
					userId: payload.userId,
					// date 컬럼이다. 시각 없이 UTC 자정으로 넘겨 날짜가 밀리지 않게 한다
					weekStart: new Date(`${payload.weekStart}T00:00:00.000Z`),
					kind: payload.kind,
					position: payload.position,
				},
			});
		} catch (error) {
			this.logger.error(
				`클릭 기록 저장 실패 (user ${payload.userId}): ${error instanceof Error ? error.message : error}`,
			);
		}

		return payload.destination;
	}

	/**
	 * 토큰의 사용자를 주간 리포트 수신 거부로 바꾼다. 토큰이 틀리면 false.
	 * @description 설정 행이 없으면 만들고, 있으면 이 컬럼만 바꾼다(upsert). 여러 번 눌러도 결과가 같다.
	 */
	async unsubscribe(token: string | null | undefined) {
		const userId = verifyUnsubscribeToken(token, this.tokenSecret);

		if (!userId) {
			return false;
		}

		await this.prisma.setting.upsert({
			where: { userId },
			create: { userId, weeklyReportEnabled: false },
			update: { weeklyReportEnabled: false },
		});

		return true;
	}

	private get tokenSecret() {
		return this.config.get("UNSUBSCRIBE_SECRET", { infer: true });
	}
}
