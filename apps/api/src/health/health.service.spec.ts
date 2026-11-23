import { HealthService } from "./health.service.js";

describe("HealthService", () => {
	it("상태 ok와 0 이상의 가동 시간을 돌려준다", () => {
		const result = new HealthService().check();

		expect(result.status).toBe("ok");
		expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
	});
});
