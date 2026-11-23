import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { SlackDeliveryError } from "./slack.service.js";

/**
 * Slack 전송 실패를 502로 바꿔 응답하고 로그에 남긴다.
 * @description 우리 서버는 정상이고 뒤의 외부 서비스가 실패했으므로 500이 아니라 502(Bad Gateway)다.
 * 서비스는 HTTP를 모르게 두고(크론에서도 쓰도록) 상태 코드 변환은 여기서만 한다.
 */
@Catch(SlackDeliveryError)
export class SlackDeliveryFilter implements ExceptionFilter {
	private readonly logger = new Logger("Slack");

	catch(error: SlackDeliveryError, host: ArgumentsHost) {
		this.logger.error(error.message);

		host
			.switchToHttp()
			.getResponse<Response>()
			.status(HttpStatus.BAD_GATEWAY)
			.json({ status: "error", message: "Slack 전송에 실패했습니다" });
	}
}
