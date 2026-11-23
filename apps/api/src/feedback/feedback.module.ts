import { Module } from "@nestjs/common";
import { SlackModule } from "../slack/slack.module.js";
import { FeedbackController } from "./feedback.controller.js";
import { FeedbackService } from "./feedback.service.js";

@Module({
	imports: [SlackModule],
	controllers: [FeedbackController],
	providers: [FeedbackService],
})
export class FeedbackModule {}
