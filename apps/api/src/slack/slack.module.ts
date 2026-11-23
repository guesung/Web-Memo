import { Module } from "@nestjs/common";
import { SlackService } from "./slack.service.js";

@Module({
	providers: [SlackService],
	exports: [SlackService],
})
export class SlackModule {}
