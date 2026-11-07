import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./nextPath";

describe("sanitizeNextPath", () => {
	it("id와 UTM 쿼리가 붙은 같은 오리진 경로는 그대로 허용한다", () => {
		const path =
			"/ko/memos?id=123&utm_source=weekly_report&utm_medium=email&utm_campaign=weekly_memo_resurface&utm_content=memo_1";

		expect(sanitizeNextPath(path)).toBe(path);
	});

	it.each([
		["외부 도메인", "https://evil.com"],
		["프로토콜 상대 경로", "//evil.com"],
		["역슬래시 경로", "/\\evil.com"],
		["탭으로 숨긴 프로토콜 상대 경로", "/\t/evil.com"],
		["상대 경로", "ko/memos"],
		["javascript 스킴", "javascript:alert(1)"],
		["빈 문자열", ""],
		["없음", undefined],
		["배열", ["/ko/memos"]],
	])("%s는 거부한다", (_name, value) => {
		expect(sanitizeNextPath(value)).toBeNull();
	});
});
