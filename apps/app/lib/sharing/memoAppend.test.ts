import { describe, expect, it } from "vitest";
import { appendMemoText } from "./memoAppend";

describe("appendMemoText", () => {
	it("기존 메모가 없으면 새 내용만 반환한다", () => {
		expect(appendMemoText("", "새 메모")).toBe("새 메모");
	});

	it("기존 메모가 공백뿐이면 새 내용만 반환한다", () => {
		expect(appendMemoText("   \n  ", "새 메모")).toBe("새 메모");
	});

	it("기존 메모 뒤에 줄바꿈으로 새 내용을 이어 붙인다", () => {
		expect(appendMemoText("기존 메모", "새 메모")).toBe("기존 메모\n새 메모");
	});

	it("기존 메모 앞뒤 공백은 정리하고 이어 붙인다", () => {
		expect(appendMemoText("  기존 메모  \n", "새 메모")).toBe(
			"기존 메모\n새 메모",
		);
	});
});
