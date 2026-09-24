import { describe, expect, it } from "vitest";
import { getSafeSettingsNext } from "./getSafeSettingsNext";

describe("설정 로그인 복귀 경로", () => {
	it.each([
		"/ko/settings",
		"/en/settings",
		"/ko/settings#extension",
		"/en/settings#extension",
	])("%s만 허용한다", (path) => {
		expect(getSafeSettingsNext(path)).toBe(path);
	});

	it.each([
		"https://evil.test",
		"//evil.test",
		"/ko/settings/../admin",
		"/ko/settings?next=//evil.test",
		"/ko/memos",
		null,
	])("설정 외 경로 %s는 거부한다", (path) => {
		expect(getSafeSettingsNext(path)).toBeNull();
	});
});
