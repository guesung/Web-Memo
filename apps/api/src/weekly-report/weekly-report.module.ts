import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { WeeklyReportController } from "./weekly-report.controller.js";
import { WeeklyReportService } from "./weekly-report.service.js";

@Module({
	imports: [PrismaModule],
	controllers: [WeeklyReportController],
	providers: [WeeklyReportService],
})
export class WeeklyReportModule {}
