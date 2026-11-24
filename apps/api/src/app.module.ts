import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { validateEnv } from "./config/env.validation.js";
import { FeedbackModule } from "./feedback/feedback.module.js";
import { HealthModule } from "./health/health.module.js";
import { SignupModule } from "./signup/signup.module.js";
import { SlackDeliveryFilter } from "./slack/slack-delivery.filter.js";
import { WeeklyReportModule } from "./weekly-report/weekly-report.module.js";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
		HealthModule,
		FeedbackModule,
		SignupModule,
		WeeklyReportModule,
	],
	providers: [
		// main.ts의 app.useGlobalPipes 대신 여기 등록하면 테스트 모듈(Test.createTestingModule)에도 똑같이 적용된다
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({ whitelist: true, transform: true }),
		},
		{ provide: APP_FILTER, useClass: SlackDeliveryFilter },
	],
})
export class AppModule {}
