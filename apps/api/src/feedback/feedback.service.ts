import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation.js";
import { SlackService } from "../slack/slack.service.js";
import type { FeedbackRecordDto } from "./feedback-webhook.dto.js";

@Injectable()
export class FeedbackService {
	constructor(
		private readonly config: ConfigService<Env, true>,
		private readonly slack: SlackService,
	) {}

	async notify(record: FeedbackRecordDto) {
		await this.slack.send(
			this.config.get("SLACK_FEEDBACK_WEBHOOK_URL", { infer: true }),
			this.buildMessage(record),
		);
	}

	/**
	 * 피드백 한 건을 Slack 메시지로 만든다.
	 * @description email·source_path는 있을 때만 줄을 붙인다. 관리자 링크는 WEB_URL이 있을 때만 붙인다 —
	 * 주소를 코드에 박으면 staging과 운영이 같은 곳을 가리키게 된다.
	 */
	buildMessage(record: FeedbackRecordDto) {
		const lines = [
			":speech_balloon: 새 피드백",
			record.content,
			`작성자 ${record.user_id ?? "비로그인"} · ${record.created_at}`,
		];

		if (record.email) {
			lines.push(`회신 ${record.email}`);
		}

		if (record.source_path) {
			lines.push(`출처 ${record.source_path}`);
		}

		const webUrl = this.config.get("WEB_URL", { infer: true });

		if (webUrl) {
			lines.push(
				`${webUrl.replace(/\/$/, "")}/ko/admin/feedback?id=${record.id}`,
			);
		}

		return lines.join("\n");
	}
}
