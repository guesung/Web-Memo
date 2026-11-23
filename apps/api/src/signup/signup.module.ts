import { Module } from "@nestjs/common";
import { SlackModule } from "../slack/slack.module.js";
import { SignupController } from "./signup.controller.js";
import { SignupService } from "./signup.service.js";

@Module({
	imports: [SlackModule],
	controllers: [SignupController],
	providers: [SignupService],
})
export class SignupModule {}
