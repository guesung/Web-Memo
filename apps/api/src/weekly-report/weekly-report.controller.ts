import {
	BadRequestException,
	Controller,
	Get,
	Header,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	Options,
	Post,
	Query,
	Req,
	Res,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { WeeklyReportService } from "./weekly-report.service.js";

/**
 * 주간 리포트 메일의 링크가 부르는 엔드포인트. 로그인 없이 호출되고, 인증은 메일에 실린 HMAC 토큰이 맡는다.
 */
@Controller("weekly-report")
export class WeeklyReportController {
	private readonly logger = new Logger(WeeklyReportController.name);

	constructor(private readonly weeklyReportService: WeeklyReportService) {}

	/**
	 * 메일 속 링크. 클릭을 기록하고 목적지로 302한다.
	 * @description Express는 HEAD 요청도 GET 핸들러로 보낸다. 메일 보안 스캐너가 보내는 HEAD를 클릭으로
	 * 세지 않도록 GET일 때만 기록한다.
	 */
	@Get("click")
	async click(
		@Query("t") token: string | undefined,
		@Req() req: Request,
		@Res() res: Response,
	) {
		const destination =
			req.method === "GET"
				? await this.weeklyReportService.recordClick(token)
				: this.weeklyReportService.webUrl;

		res.setHeader("Cache-Control", "no-store");
		res.redirect(HttpStatus.FOUND, destination);
	}

	/**
	 * 수신 거부. 웹 확인 페이지(브라우저)와 메일 클라이언트의 One-Click(RFC 8058)이 부른다.
	 * @description 토큰은 두 형태로 온다. (a) JSON 본문 `{ token }` (b) One-Click: form 본문
	 * `List-Unsubscribe=One-Click` + 쿼리 `token`. 웹 페이지가 다른 출처에서 부르므로 CORS를 연다.
	 */
	@Post("unsubscribe")
	@HttpCode(HttpStatus.OK)
	@Header("Access-Control-Allow-Origin", "*")
	async unsubscribe(@Req() req: Request) {
		const token = this.readUnsubscribeToken(req);
		let isUnsubscribed: boolean;

		try {
			isUnsubscribed = await this.weeklyReportService.unsubscribe(token);
		} catch (error) {
			// 토큰 값은 로그에 남기지 않는다
			this.logger.error(
				`수신 거부 저장 실패: ${error instanceof Error ? error.message : error}`,
			);

			throw new InternalServerErrorException({ error: "internal_error" });
		}

		if (!isUnsubscribed) {
			throw new UnauthorizedException({ error: "invalid_token" });
		}

		return { status: "ok" };
	}

	/** 브라우저가 JSON POST 전에 보내는 사전 요청(preflight)에 답한다 */
	@Options("unsubscribe")
	@HttpCode(HttpStatus.NO_CONTENT)
	@Header("Access-Control-Allow-Origin", "*")
	@Header("Access-Control-Allow-Headers", "content-type")
	@Header("Access-Control-Allow-Methods", "POST, OPTIONS")
	preflight() {}

	private readUnsubscribeToken(req: Request): string | null {
		if (req.is("application/json")) {
			const token = (req.body as { token?: unknown } | undefined)?.token;

			return typeof token === "string" ? token : null;
		}

		if (req.is("application/x-www-form-urlencoded")) {
			const body = req.body as Record<string, unknown> | undefined;

			if (body?.["List-Unsubscribe"] !== "One-Click") {
				throw new BadRequestException({ error: "bad_request" });
			}

			return typeof req.query.token === "string" ? req.query.token : null;
		}

		throw new BadRequestException({ error: "bad_request" });
	}
}
