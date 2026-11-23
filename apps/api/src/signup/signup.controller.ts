import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from "@nestjs/common";
import { WebhookSecretGuard } from "../webhook/webhook-secret.guard.js";
import { SignupService } from "./signup.service.js";
import { SignupWebhookDto } from "./signup-webhook.dto.js";

@Controller("webhooks/signup")
@UseGuards(WebhookSecretGuard)
export class SignupController {
	constructor(private readonly signupService: SignupService) {}

	@Post()
	@HttpCode(HttpStatus.OK)
	async receive(@Body() body: SignupWebhookDto) {
		await this.signupService.notify(body.record);

		return { status: "success" };
	}
}
