import { describe, expect, it } from "vitest";
import { buildMarker, parseMarker } from "./markers.ts";

describe("buildMarker", () => {
	it("페르소나와 종류로 마커 문자열을 만든다", () => {
		expect(buildMarker({ persona: "intern", kind: "q3" })).toBe("<!-- ai-review:intern:q3 -->");
		expect(buildMarker({ persona: "senior", kind: "scan" })).toBe("<!-- ai-review:senior:scan -->");
	});
});

describe("parseMarker", () => {
	it("본문 끝의 마커를 파싱한다", () => {
		const body = "**이도현** · 인턴 개발자\n\n질문입니다.\n\n<!-- ai-review:intern:q1 -->";
		expect(parseMarker(body)).toEqual({ persona: "intern", kind: "q1" });
	});

	it("마커가 없으면 null을 반환한다", () => {
		expect(parseMarker("사람이 쓴 평범한 코멘트")).toBeNull();
	});

	it("ai-followup 마커는 우리 마커가 아니므로 null을 반환한다", () => {
		expect(parseMarker("<!-- ai-followup:start -->")).toBeNull();
	});

	it("알 수 없는 페르소나는 null을 반환한다", () => {
		expect(parseMarker("<!-- ai-review:manager:q1 -->")).toBeNull();
	});

	it("주석 내부 공백 변형을 허용한다", () => {
		expect(parseMarker("<!--ai-review:senior:reply-->")).toEqual({
			persona: "senior",
			kind: "reply",
		});
	});

	it("buildMarker 결과를 그대로 되읽는다", () => {
		const marker = { persona: "senior", kind: "q2" } as const;
		expect(parseMarker(`본문\n${buildMarker(marker)}`)).toEqual(marker);
	});
});
