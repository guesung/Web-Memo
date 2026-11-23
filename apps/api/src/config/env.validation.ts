import { plainToInstance, Type } from "class-transformer";
import {
	IsInt,
	IsOptional,
	IsUrl,
	Max,
	Min,
	MinLength,
	validateSync,
} from "class-validator";

/**
 * 서버가 읽는 환경 변수 목록이자 검증 규칙.
 * @description 값이 빠졌거나 형식이 틀리면 요청을 처리할 때가 아니라 서버가 뜰 때 실패시킨다.
 */
class EnvironmentVariables {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(65535)
	PORT = 4000;

	/** Supabase가 웹훅을 부를 때 x-webhook-secret 헤더에 싣는 공유 비밀 */
	@MinLength(32)
	WEBHOOK_SECRET!: string;

	@IsUrl({ protocols: ["https"], require_protocol: true })
	SLACK_FEEDBACK_WEBHOOK_URL!: string;

	@IsUrl({ protocols: ["https"], require_protocol: true })
	SLACK_SIGNUP_WEBHOOK_URL!: string;

	/** 피드백 알림의 관리자 링크에 쓴다. 없으면 링크 줄만 뺀다 */
	@IsOptional()
	@IsUrl({ require_tld: false, require_protocol: true })
	WEB_URL?: string;
}

export type Env = EnvironmentVariables;

export const validateEnv = (config: Record<string, unknown>) => {
	const env = plainToInstance(EnvironmentVariables, config, {
		enableImplicitConversion: false,
	});
	const errors = validateSync(env, { skipMissingProperties: false });

	if (errors.length > 0) {
		const names = errors.map((error) => error.property).join(", ");

		throw new Error(`환경 변수가 없거나 형식이 틀립니다: ${names}`);
	}

	return env;
};
