/**
 * 코드 컨벤션 원장(docs/code-conventions.yaml)을 읽고 형식을 검증합니다.
 *
 * 원장은 사람이 손으로 고치는 파일이라 오타 키, 겹치는 id, 가리키는 곳이 없는 replaced_by 같은
 * 어긋남이 에러 없이 쌓입니다. 이 모듈은 그 형식을 PR CI에서 기계적으로 잡습니다.
 * 규칙의 내용이 옳은지는 다루지 않고, 형태와 항목 사이의 참조만 봅니다.
 *
 * .github/scripts는 무의존이 관례지만 이 모듈만 `yaml` 패키지를 씁니다. 규칙·예시가 여러 줄 블록
 * 스칼라(|)라서 부분집합 파서로는 안전하게 읽을 수 없기 때문입니다.
 */

import { parse } from "yaml";

/** 원장 항목이 가져야 하는 키 전부. 이 밖의 키는 오타로 보고 실패시킵니다. */
export const LEDGER_KEYS = [
	"id",
	"name",
	"category",
	"principles",
	"scope",
	"status",
	"severity",
	"rule",
	"why",
	"exceptions",
	"examples",
	"pr",
	"replaced_by",
];

export const LEDGER_CATEGORIES = [
	"네이밍",
	"구조·배치",
	"문법 스타일",
	"주석·문서",
	"관행",
];
export const LEDGER_STATUSES = ["적용중", "보류", "폐기"];
export const LEDGER_SEVERITIES = ["필수", "권장"];
export const LEDGER_PRINCIPLES = [
	"가독성",
	"예측 가능성",
	"응집도",
	"결합도",
];

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EXAMPLE_KEYS = ["bad", "good"];
const DEPRECATED = "폐기";

const isPlainObject = (value) =>
	typeof value === "object" && value !== null && !Array.isArray(value);
const isFilledString = (value) =>
	typeof value === "string" && value.trim() !== "";
const formatList = (values) => values.join(" · ");

/**
 * 원장 텍스트를 해석합니다. YAML 문법 오류는 그대로 던집니다.
 *
 * @param {string} text
 */
export const parseLedger = (text) => parse(text);

/**
 * 해석한 원장을 검증해 오류 문자열 배열을 돌려줍니다. 첫 오류에서 멈추지 않고 전부 모읍니다.
 * 각 줄은 `<항목 식별자>: <무엇이 왜>` 형태이고, id를 못 읽는 항목은 `#<인덱스>`로 가리킵니다.
 *
 * @param {unknown} data
 * @returns {string[]}
 */
export const validateLedger = (data) => {
	if (!isPlainObject(data) || !Array.isArray(data.rules)) {
		return ["원장: 최상위가 `rules:` 배열을 가진 객체여야 합니다"];
	}

	const extraTopKeys = Object.keys(data).filter((key) => key !== "rules");
	const errors = extraTopKeys.map(
		(key) => `원장: 최상위에 허용되지 않는 키 '${key}'가 있습니다`,
	);

	if (data.rules.length === 0) {
		return [...errors, "원장: rules가 비어 있습니다"];
	}

	const rules = data.rules;
	const labels = rules.map((rule, index) =>
		isPlainObject(rule) && isFilledString(rule.id) ? rule.id : `#${index}`,
	);
	const idCounts = new Map();

	for (const rule of rules) {
		if (isPlainObject(rule) && typeof rule.id === "string") {
			idCounts.set(rule.id, (idCounts.get(rule.id) ?? 0) + 1);
		}
	}

	const statusById = new Map();

	for (const rule of rules) {
		if (isPlainObject(rule) && typeof rule.id === "string") {
			statusById.set(rule.id, rule.status);
		}
	}

	rules.forEach((rule, index) => {
		const label = labels[index];
		const report = (message) => errors.push(`${label}: ${message}`);

		if (!isPlainObject(rule)) {
			report("항목이 객체가 아닙니다");

			return;
		}

		for (const key of LEDGER_KEYS) {
			if (!(key in rule)) {
				report(`필수 키 '${key}'가 없습니다`);
			}
		}

		for (const key of Object.keys(rule)) {
			if (!LEDGER_KEYS.includes(key)) {
				report(`허용되지 않는 키 '${key}'가 있습니다`);
			}
		}

		if ("id" in rule) {
			if (typeof rule.id !== "string" || !ID_PATTERN.test(rule.id)) {
				report("id는 kebab-case 문자열이어야 합니다");
			} else if (idCounts.get(rule.id) > 1) {
				report("id가 다른 항목과 겹칩니다");
			}
		}

		for (const key of ["name", "rule", "why"]) {
			if (key in rule && !isFilledString(rule[key])) {
				report(`${key}는 비어 있지 않은 문자열이어야 합니다`);
			}
		}

		const enums = [
			["category", LEDGER_CATEGORIES],
			["status", LEDGER_STATUSES],
			["severity", LEDGER_SEVERITIES],
		];

		for (const [key, allowed] of enums) {
			if (key in rule && !allowed.includes(rule[key])) {
				report(`${key}는 ${formatList(allowed)} 중 하나여야 합니다`);
			}
		}

		if ("principles" in rule) {
			if (!Array.isArray(rule.principles) || rule.principles.length === 0) {
				report("principles는 비어 있지 않은 배열이어야 합니다");
			} else {
				for (const value of rule.principles) {
					if (!LEDGER_PRINCIPLES.includes(value)) {
						report(
							`principles에 허용되지 않는 값 '${String(value)}'가 있습니다 (${formatList(LEDGER_PRINCIPLES)})`,
						);
					}
				}
			}
		}

		if ("scope" in rule) {
			if (!Array.isArray(rule.scope) || rule.scope.length === 0) {
				report("scope는 비어 있지 않은 배열이어야 합니다");
			} else if (!rule.scope.every(isFilledString)) {
				report("scope의 원소는 비어 있지 않은 문자열이어야 합니다");
			}
		}

		if ("exceptions" in rule && !Array.isArray(rule.exceptions)) {
			report("exceptions는 배열이어야 합니다 (없으면 [])");
		}

		if ("examples" in rule) {
			const { examples } = rule;

			if (!isPlainObject(examples)) {
				report("examples는 객체여야 합니다");
			} else {
				const present = Object.keys(examples).filter((key) =>
					EXAMPLE_KEYS.includes(key),
				);

				if (present.length === 0) {
					report("examples에 bad·good 중 하나는 있어야 합니다");
				}

				for (const key of Object.keys(examples)) {
					if (!EXAMPLE_KEYS.includes(key)) {
						report(`examples에 허용되지 않는 키 '${key}'가 있습니다`);
					} else if (!isFilledString(examples[key])) {
						report(
							`examples.${key}는 비어 있지 않은 문자열이어야 합니다`,
						);
					}
				}
			}
		}

		if (
			"pr" in rule &&
			rule.pr !== null &&
			!(typeof rule.pr === "string" && rule.pr.startsWith("https://"))
		) {
			report("pr은 null 또는 https:// URL이어야 합니다");
		}

		if ("replaced_by" in rule && "status" in rule) {
			const target = rule.replaced_by;

			if (rule.status === DEPRECATED) {
				if (target === null) {
					report("폐기 항목은 replaced_by에 대신할 규칙의 id가 있어야 합니다");
				} else if (typeof target !== "string" || !statusById.has(target)) {
					report(`replaced_by '${String(target)}'에 해당하는 항목이 없습니다`);
				} else if (target === rule.id) {
					report("replaced_by가 자기 자신입니다");
				} else if (statusById.get(target) === DEPRECATED) {
					report(`replaced_by '${target}'는 폐기된 항목입니다`);
				}
			} else if (LEDGER_STATUSES.includes(rule.status) && target !== null) {
				report("폐기가 아닌 항목의 replaced_by는 null이어야 합니다");
			}
		}
	});

	return errors;
};
