import { describe, expect, it } from "vitest";
import { matchQuote } from "./matchQuote";

describe("matchQuote", () => {
	it("정확히 일치하는 문장을 찾는다", () => {
		const match = matchQuote("가나다라마바사", "다라마");

		expect(match).not.toBeNull();
		expect(match?.start).toBe(2);
		expect(match?.end).toBe(5);
	});

	it("같은 문장이 여러 번 나오면 prefix로 구분한다", () => {
		const text = "하나 사과 둘 사과 셋";
		const match = matchQuote(text, "사과", { prefix: "둘 " });

		expect(match?.start).toBe(text.indexOf("사과", 5));
	});

	it("같은 문장이 여러 번 나오면 suffix로 구분한다", () => {
		const text = "사과 알파 사과 베타";
		const match = matchQuote(text, "사과", { suffix: " 베타" });

		expect(match?.start).toBe(text.indexOf("사과", 5));
	});

	it("prefix와 suffix가 같으면 위치 힌트로 더 가까운 쪽을 고른다", () => {
		const text = "x 사과 y x 사과 y";
		const match = matchQuote(text, "사과", { hint: 11 });

		expect(match?.start).toBe(text.indexOf("사과", 5));
	});

	it("원문이 조금 바뀌어도 근사 매칭으로 찾는다", () => {
		const match = matchQuote(
			"리액트는 사용자 인터페이스를 만들기 위한 라이브러리입니다",
			"리액트는 사용자 인터페이스를 만드는 라이브러리입니다",
		);

		expect(match).not.toBeNull();
	});

	it("구조는 비슷하지만 내용이 다른 문장은 찾지 않는다", () => {
		const match = matchQuote(
			"서울에서 부산까지 기차로 세 시간 걸립니다",
			"제주에서 광주까지 배로 다섯 시간 걸립니다",
		);

		expect(match).toBeNull();
	});

	it("원문에서 사라진 문장은 null을 반환한다", () => {
		const match = matchQuote(
			"완전히 다른 내용만 들어 있는 문서",
			"존재하지 않는 문장입니다",
		);

		expect(match).toBeNull();
	});

	it("빈 인용문은 null을 반환한다", () => {
		expect(matchQuote("아무 문서", "")).toBeNull();
	});
});
