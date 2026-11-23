import { Type } from "class-transformer";
import {
	IsDateString,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsUUID,
	Min,
	ValidateNested,
} from "class-validator";

/** feedback.feedbacks에 새로 생긴 행. id는 bigint라 JSON에서 숫자로 온다 */
export class FeedbackRecordDto {
	@IsInt()
	@Min(1)
	id!: number;

	@IsString()
	@IsNotEmpty()
	content!: string;

	@IsOptional()
	@IsUUID()
	user_id?: string | null;

	@IsOptional()
	@IsString()
	email?: string | null;

	@IsOptional()
	@IsString()
	source_path?: string | null;

	@IsDateString()
	created_at!: string;
}

/**
 * Supabase Database Webhook이 보내는 본문.
 * @description type·table·schema·old_record도 함께 오지만 쓰지 않으므로 받지 않는다(ValidationPipe whitelist가 지운다).
 */
export class FeedbackWebhookDto {
	@ValidateNested()
	@Type(() => FeedbackRecordDto)
	record!: FeedbackRecordDto;
}
