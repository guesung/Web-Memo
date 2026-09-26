import { describe, expect, it } from "vitest";
import {
	applyExtensionMessages,
	applyWebTranslations,
	findDuplicateTopLevelKeys,
	flattenExtensionMessages,
	flattenWebTranslations,
} from "./copy-files.mjs";

describe("flattenWebTranslations", () => {
	it("문자열 leaf를 점 경로 키로 평탄화한다", () => {
		const { flat, excludedKeys } = flattenWebTranslations({
			common: { save: "저장", count: 3 },
			sideBar: { memo: "내 메모" },
		});
		expect(flat).toEqual({ "common.save": "저장", "sideBar.memo": "내 메모" });
		expect(excludedKeys).toEqual(["common.count"]);
	});
	it("최상위 updates·privacy는 건너뛰고 제외 목록에도 넣지 않는다", () => {
		const { flat, excludedKeys } = flattenWebTranslations({
			updates: { v1: { title: "제목" } },
			privacy: "약관",
			common: { save: "저장" },
		});
		expect(flat).toEqual({ "common.save": "저장" });
		expect(excludedKeys).toEqual([]);
	});
	it("배열 값은 제외 목록에 담는다", () => {
		const { flat, excludedKeys } = flattenWebTranslations({
			common: { list: ["a", "b"] },
		});
		expect(flat).toEqual({});
		expect(excludedKeys).toEqual(["common.list"]);
	});
});

describe("applyWebTranslations", () => {
	it("값만 교체하고 키 순서를 유지한다", () => {
		const original = { common: { save: "저장", close: "닫기" }, updates: {} };
		const next = applyWebTranslations(original, { "common.save": "저장하기" });
		expect(Object.keys(next.common)).toEqual(["save", "close"]);
		expect(next.common.save).toBe("저장하기");
		expect(next.common.close).toBe("닫기");
		expect(next.updates).toEqual({});
		expect(original.common.save).toBe("저장");
	});
});

describe("flattenExtensionMessages / applyExtensionMessages", () => {
	it("message 값만 뽑고, 반영 시 placeholders·description·순서를 보존한다", () => {
		const messages = {
			save: { message: "저장" },
			past_memo_related: {
				message: "관련 메모 $count$개",
				description: "설명",
				placeholders: { count: { content: "$1", example: "3" } },
			},
		};
		expect(flattenExtensionMessages(messages)).toEqual({
			save: "저장",
			past_memo_related: "관련 메모 $count$개",
		});
		const next = applyExtensionMessages(messages, { save: "저장하기" });
		expect(Object.keys(next)).toEqual(["save", "past_memo_related"]);
		expect(next.save).toEqual({ message: "저장하기" });
		expect(next.past_memo_related).toEqual(messages.past_memo_related);
		expect(messages.save.message).toBe("저장");
	});
	it("새 키는 message만 담아 추가한다", () => {
		const next = applyExtensionMessages({}, { hello: "안녕" });
		expect(next).toEqual({ hello: { message: "안녕" } });
	});
});

describe("findDuplicateTopLevelKeys", () => {
	it("최상위 중복 키를 찾는다", () => {
		const text = `{
			"a": { "message": "1" },
			"b": { "message": "2" },
			"a": { "message": "3" }
		}`;
		expect(findDuplicateTopLevelKeys(text)).toEqual(["a"]);
	});
	it("중첩 객체의 message 같은 키는 최상위로 세지 않는다", () => {
		const text = `{
			"a": { "message": "1", "description": "x" },
			"b": { "message": "2" }
		}`;
		expect(findDuplicateTopLevelKeys(text)).toEqual([]);
	});
	it("이스케이프된 따옴표가 있어도 정확히 파싱한다", () => {
		const text = `{
			"a": { "message": "그는 \\"안녕\\"이라 했다" }
		}`;
		expect(findDuplicateTopLevelKeys(text)).toEqual([]);
	});
});
