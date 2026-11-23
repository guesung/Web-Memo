import { TEST_ENV } from "../../test/testEnv.js";
import { validateEnv } from "./env.validation.js";

describe("validateEnv", () => {
	it("필수 값이 빠지면 빠진 이름을 모두 담아 실패한다", () => {
		expect(() => validateEnv({})).toThrow(
			/WEBHOOK_SECRET, SLACK_FEEDBACK_WEBHOOK_URL, SLACK_SIGNUP_WEBHOOK_URL/,
		);
	});

	it("짧은 웹훅 비밀은 거부한다", () => {
		expect(() => validateEnv({ ...TEST_ENV, WEBHOOK_SECRET: "short" })).toThrow(
			/WEBHOOK_SECRET/,
		);
	});

	it("PORT 문자열을 숫자로 바꾸고, 없으면 4000을 쓴다", () => {
		expect(validateEnv({ ...TEST_ENV, PORT: "4010" }).PORT).toBe(4010);
		expect(validateEnv(TEST_ENV).PORT).toBe(4000);
	});
});
