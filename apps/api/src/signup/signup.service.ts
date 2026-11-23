import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation.js";
import { SlackService } from "../slack/slack.service.js";
import type { SignupRecordDto } from "./signup-webhook.dto.js";

@Injectable()
export class SignupService {
	constructor(
		private readonly config: ConfigService<Env, true>,
		private readonly slack: SlackService,
	) {}

	async notify(record: SignupRecordDto) {
		await this.slack.send(
			this.config.get("SLACK_SIGNUP_WEBHOOK_URL", { infer: true }),
			this.buildMessage(record),
		);
	}

	buildMessage(record: SignupRecordDto) {
		return [
			":tada: 신규 가입",
			`user ${record.id} · ${record.created_at}`,
		].join("\n");
	}
}
