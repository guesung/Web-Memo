import { Injectable } from "@nestjs/common";

interface HealthStatus {
	status: "ok";
	uptimeSeconds: number;
}

@Injectable()
export class HealthService {
	check(): HealthStatus {
		return { status: "ok", uptimeSeconds: Math.floor(process.uptime()) };
	}
}
