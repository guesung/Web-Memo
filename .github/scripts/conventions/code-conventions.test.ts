import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseLedger, validateLedger } from "./code-conventions.mjs";

const rule = (overrides: Record<string, unknown> = {}) => ({
	id: "sample-rule",
	name: "샘플 규칙",
	category: "네이밍",
	principles: ["가독성"],
	scope: ["apps/**"],
	status: "적용중",
	severity: "필수",
	rule: "이렇게 한다",
	why: "이유가 있다",
	exceptions: [],
	examples: { bad: "a", good: "b" },
	pr: null,
	replaced_by: null,
	...overrides,
});

const ledger = (...rules: unknown[]) => ({ rules });

const without = (key: string) => {
	const base: Record<string, unknown> = rule();
	delete base[key];

	return base;
};

describe("validateLedger", () => {
	it("올바른 원장은 오류가 없다", () => {
		expect(validateLedger(ledger(rule()))).toEqual([]);
	});

	it.each([
		["최상위가 객체가 아님", []],
		["rules 키가 없음", {}],
		["rules가 배열이 아님", { rules: "x" }],
		["rules가 빈 배열", { rules: [] }],
	])("%s이면 실패한다", (_name, data) => {
		expect(validateLedger(data).length).toBeGreaterThan(0);
	});

	it("YAML 문법 오류는 해석 단계에서 던진다", () => {
		expect(() => parseLedger("rules: [a, b")).toThrow();
	});

	it("블록 스칼라를 문자열로 읽는다", () => {
		const data = parseLedger("rules:\n  - rule: |\n      첫째\n      둘째\n");

		expect(data.rules[0].rule).toBe("첫째\n둘째\n");
	});

	it("필수 키가 없으면 항목 식별자와 키 이름을 출력한다", () => {
		const errors = validateLedger(ledger(without("why")));

		expect(errors).toEqual(["sample-rule: 필수 키 'why'가 없습니다"]);
	});

	it("13개 밖의 키는 실패한다", () => {
		const errors = validateLedger(ledger(rule({ sevrity: "필수" })));

		expect(errors.join("\n")).toContain("허용되지 않는 키 'sevrity'");
	});

	it("id가 kebab-case가 아니면 실패한다", () => {
		const errors = validateLedger(ledger(rule({ id: "Bad_Id" })));

		expect(errors.join("\n")).toContain("kebab-case");
	});

	it("id가 겹치면 실패한다", () => {
		const errors = validateLedger(ledger(rule(), rule()));

		expect(errors.filter((line) => line.includes("겹칩니다"))).toHaveLength(2);
	});

	it("id가 없거나 문자열이 아니면 식별자는 #인덱스다", () => {
		const errors = validateLedger(ledger(rule(), rule({ id: 3 }), without("id")));

		expect(errors.some((line) => line.startsWith("#1: "))).toBe(true);
		expect(errors.some((line) => line.startsWith("#2: "))).toBe(true);
	});

	it.each(["name", "rule", "why"])("%s가 빈 문자열이면 실패한다", (key) => {
		expect(validateLedger(ledger(rule({ [key]: "  " }))).join()).toContain(key);
		expect(validateLedger(ledger(rule({ [key]: 1 }))).join()).toContain(key);
	});

	it.each([
		["category", "스타일"],
		["status", "삭제"],
		["severity", "중요"],
	])("%s가 허용 값 밖이면 실패한다", (key, value) => {
		expect(validateLedger(ledger(rule({ [key]: value }))).join()).toContain(key);
	});

	it.each([
		["배열 아님", "가독성"],
		["빈 배열", []],
		["허용 값 밖", ["가독성", "속도"]],
	])("principles가 %s이면 실패한다", (_name, value) => {
		expect(validateLedger(ledger(rule({ principles: value }))).join()).toContain(
			"principles",
		);
	});

	it.each([
		["배열 아님", "apps/**"],
		["빈 배열", []],
		["빈 문자열 원소", ["apps/**", ""]],
		["문자열 아닌 원소", [1]],
	])("scope가 %s이면 실패한다", (_name, value) => {
		expect(validateLedger(ledger(rule({ scope: value }))).join()).toContain(
			"scope",
		);
	});

	it("exceptions가 배열이 아니면 실패하고 빈 배열은 통과한다", () => {
		expect(validateLedger(ledger(rule({ exceptions: "없음" }))).join()).toContain(
			"exceptions",
		);
		expect(validateLedger(ledger(rule({ exceptions: [] })))).toEqual([]);
	});

	it.each([
		["객체 아님", "x"],
		["bad·good 둘 다 없음", {}],
		["bad가 빈 문자열", { bad: "" }],
		["good이 문자열 아님", { good: 1 }],
		["bad·good 외 키", { bad: "a", ok: "b" }],
	])("examples가 %s이면 실패한다", (_name, value) => {
		expect(validateLedger(ledger(rule({ examples: value }))).join()).toContain(
			"examples",
		);
	});

	it("examples는 한쪽만 있어도 통과한다", () => {
		expect(validateLedger(ledger(rule({ examples: { good: "b" } })))).toEqual([]);
		expect(validateLedger(ledger(rule({ examples: { bad: "a" } })))).toEqual([]);
	});

	it("pr은 null 또는 https URL만 통과한다", () => {
		expect(
			validateLedger(ledger(rule({ pr: "https://github.com/a/b/pull/1" }))),
		).toEqual([]);
		expect(validateLedger(ledger(rule({ pr: "http://x" }))).join()).toContain("pr");
		expect(validateLedger(ledger(rule({ pr: "" }))).join()).toContain("pr");
	});

	describe("replaced_by", () => {
		const deprecated = (replacedBy: unknown) =>
			rule({ id: "old-rule", status: "폐기", replaced_by: replacedBy });

		it("폐기 항목이 적용중 항목을 가리키면 통과한다", () => {
			expect(validateLedger(ledger(rule(), deprecated("sample-rule")))).toEqual([]);
		});

		it("폐기인데 null이면 실패한다", () => {
			expect(validateLedger(ledger(deprecated(null))).join()).toContain(
				"replaced_by",
			);
		});

		it("없는 id를 가리키면 실패한다", () => {
			expect(validateLedger(ledger(deprecated("ghost"))).join()).toContain(
				"해당하는 항목이 없습니다",
			);
		});

		it("자기 자신을 가리키면 실패한다", () => {
			expect(validateLedger(ledger(deprecated("old-rule"))).join()).toContain(
				"자기 자신",
			);
		});

		it("다른 폐기 항목을 가리키면 실패한다", () => {
			const other = rule({ id: "older-rule", status: "폐기", replaced_by: "sample-rule" });

			expect(
				validateLedger(ledger(rule(), other, deprecated("older-rule"))).join(),
			).toContain("폐기된 항목");
		});

		it("폐기가 아닌데 null이 아니면 실패한다", () => {
			const other = rule({ id: "other-rule", replaced_by: "sample-rule" });

			expect(validateLedger(ledger(rule(), other)).join()).toContain(
				"null이어야 합니다",
			);
		});
	});

	it("오류를 첫 번째에서 멈추지 않고 모은다", () => {
		const errors = validateLedger(
			ledger(rule({ name: "", severity: "x" }), rule({ id: "second", pr: "x" })),
		);

		expect(errors.length).toBeGreaterThanOrEqual(3);
	});
});

describe("docs/code-conventions.yaml", () => {
	it("실제 원장이 검사를 통과한다", () => {
		const text = readFileSync(
			resolve(__dirname, "../../../docs/code-conventions.yaml"),
			"utf8",
		);

		expect(validateLedger(parseLedger(text))).toEqual([]);
	});
});
