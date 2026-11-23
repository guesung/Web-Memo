import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from "@nestjs/common";
import { WebhookSecretGuard } from "../webhook/webhook-secret.guard.js";
import { FeedbackService } from "./feedback.service.js";
import { FeedbackWebhookDto } from "./feedback-webhook.dto.js";

@Controller("webhooks/feedback")
@UseGuards(WebhookSecretGuard)
export class FeedbackController {
	constructor(private readonly feedbackService: FeedbackService) {}

	@Post()
	@HttpCode(HttpStatus.OK)
	async receive(@Body() body: FeedbackWebhookDto) {
		await this.feedbackService.notify(body.record);

		return { status: "success" };
	}
}
