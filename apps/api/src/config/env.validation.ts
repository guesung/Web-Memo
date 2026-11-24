import { plainToInstance, Type } from "class-transformer";
import {
	IsInt,
	IsOptional,
	IsUrl,
	Matches,
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

	/**
	 * Postgres 접속 주소(`postgresql://사용자:비밀번호@호스트:포트/DB`). API 전용 DB 역할로 붙는다.
	 * 형식만 본다. 실제 연결은 첫 쿼리 때 하므로 DB가 죽어 있어도 서버는 뜬다
	 */
	@Matches(/^postgres(ql)?:\/\/.+/)
	DATABASE_URL!: string;

	/** 주간 리포트 메일의 수신 거부·클릭 토큰 서명 키. 메일을 보내는 Edge Function과 같은 값이어야 한다 */
	@MinLength(32)
	UNSUBSCRIBE_SECRET!: string;

	/** 피드백 알림의 관리자 링크, 메일 링크의 리다이렉트 허용 판정에 쓴다. 없으면 링크 줄을 빼고 운영 주소로 판정한다 */
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
