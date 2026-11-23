import { Type } from "class-transformer";
import { IsDateString, IsUUID, ValidateNested } from "class-validator";

/** auth.users에 새로 생긴 행. 개인정보(이메일 등)는 받지 않는다 */
export class SignupRecordDto {
	@IsUUID()
	id!: string;

	@IsDateString()
	created_at!: string;
}

/** 가입 트리거(pg_net)가 보내는 본문 */
export class SignupWebhookDto {
	@ValidateNested()
	@Type(() => SignupRecordDto)
	record!: SignupRecordDto;
}
