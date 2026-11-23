import { timingSafeEqual } from "node:crypto";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { Env } from "../config/env.validation.js";

export const WEBHOOK_SECRET_HEADER = "x-webhook-secret";

/**
 * Supabase(DB 웹훅·pg_net)만 부르는 엔드포인트의 호출자를 공유 비밀 헤더로 확인한다.
 * @description 문자열을 ===로 비교하면 앞에서부터 다른 글자가 나오는 순간 멈춰, 응답 시간으로
 * 비밀을 한 글자씩 추측할 수 있다(타이밍 공격). timingSafeEqual은 길이가 같으면 항상 끝까지 비교한다.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
	constructor(private readonly config: ConfigService<Env, true>) {}

	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<Request>();
		const received = Buffer.from(request.header(WEBHOOK_SECRET_HEADER) ?? "");
		const expected = Buffer.from(
			this.config.get("WEBHOOK_SECRET", { infer: true }),
		);

		if (
			received.length !== expected.length ||
			!timingSafeEqual(received, expected)
		) {
			throw new UnauthorizedException();
		}

		return true;
	}
}
