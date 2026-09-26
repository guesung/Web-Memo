import { readFile, writeFile } from "node:fs/promises";

/**
 * 웹 번역 JSON에서 관리 대상으로 삼지 않는 최상위 섹션입니다.
 * @description `updates`(릴리스 노트)·`privacy`(약관 본문)는 문구 관리 시트로 옮기지 않는다 — 형식이 다르고 사람이 직접 다듬는 긴 글이다.
 */
export const WEB_TRANSLATION_EXCLUDED_TOP_LEVEL_KEYS = ["updates", "privacy"];

/** 관리 대상 로케일 파일 경로(레포 루트 기준). */
export const COPY_TARGET_FILES = {
	web: {
		ko: "apps/web/src/modules/i18n/locales/ko/translation.json",
		en: "apps/web/src/modules/i18n/locales/en/translation.json",
	},
	extension: {
		ko: "apps/chrome-extension/public/_locales/ko/messages.json",
		en: "apps/chrome-extension/public/_locales/en/messages.json",
	},
};

/** JSON 파일을 읽어 파싱합니다. */
export const readJsonFile = async (path) => JSON.parse(await readFile(path, "utf8"));

/** 탭 들여쓰기 JSON + 끝 개행 1개로 파일을 씁니다. */
export const writeJsonFile = async (path, value) => {
	await writeFile(path, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
};

/**
 * 웹 번역 JSON을 문자열 leaf만 점 경로 키로 평탄화합니다.
 * @description 최상위 `updates`·`privacy`는 조용히 건너뛴다. 그 밖의 배열·비문자열 값은 자동 제외하고 `excludedKeys`로 돌려준다.
 */
export const flattenWebTranslations = (translations) => {
	const flat = {};
	const excludedKeys = [];

	const walk = (node, pathParts) => {
		for (const key of Object.keys(node)) {
			if (
				pathParts.length === 0 &&
				WEB_TRANSLATION_EXCLUDED_TOP_LEVEL_KEYS.includes(key)
			) {
				continue;
			}
			const value = node[key];
			const path = [...pathParts, key];
			if (typeof value === "string") {
				flat[path.join(".")] = value;
			} else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
				walk(value, path);
			} else {
				excludedKeys.push(path.join("."));
			}
		}
	};
	walk(translations, []);

	return { flat, excludedKeys };
};

/**
 * 평탄화된 값을 웹 번역 JSON 원본에 반영합니다.
 * @description 키 순서는 원본을 그대로 유지하고 값만 교체한다. `flat`에 없는 키는 건드리지 않는다.
 */
export const applyWebTranslations = (translations, flat) => {
	const next = structuredClone(translations);

	for (const [dotPath, value] of Object.entries(flat)) {
		const segments = dotPath.split(".");
		let cursor = next;
		for (const segment of segments.slice(0, -1)) {
			if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
				cursor[segment] = {};
			}
			cursor = cursor[segment];
		}
		cursor[segments.at(-1)] = value;
	}

	return next;
};

/** 확장 messages.json에서 키→message 값만 뽑습니다. */
export const flattenExtensionMessages = (messages) => {
	const flat = {};
	for (const [key, entry] of Object.entries(messages)) {
		if (entry && typeof entry.message === "string") {
			flat[key] = entry.message;
		}
	}

	return flat;
};

/**
 * message 값만 확장 messages.json 원본에 반영합니다.
 * @description placeholders·description·키 순서를 그대로 보존한다. `flat`에 없는 키는 건드리지 않는다.
 */
export const applyExtensionMessages = (messages, flat) => {
	const next = structuredClone(messages);

	for (const [key, message] of Object.entries(flat)) {
		if (next[key]) {
			next[key] = { ...next[key], message };
		} else {
			next[key] = { message };
		}
	}

	return next;
};

/**
 * JSON 원문에서 최상위 키 중복을 찾습니다.
 * @description `JSON.parse`는 중복 키의 마지막 값만 남기고 조용히 삼키므로, 원문 텍스트를 직접 훑어야 한다.
 */
export const findDuplicateTopLevelKeys = (jsonText) => {
	const keys = extractTopLevelKeys(jsonText);
	const seen = new Set();
	const duplicates = new Set();
	for (const key of keys) {
		if (seen.has(key)) {
			duplicates.add(key);
		}
		seen.add(key);
	}

	return [...duplicates];
};

const extractTopLevelKeys = (jsonText) => {
	const keys = [];
	let depth = 0;
	let index = 0;
	const length = jsonText.length;

	while (index < length) {
		const char = jsonText[index];
		if (char === '"') {
			const start = index;
			index += 1;
			while (index < length && jsonText[index] !== '"') {
				if (jsonText[index] === "\\") {
					index += 1;
				}
				index += 1;
			}
			const end = index + 1;
			const raw = jsonText.slice(start, end);
			index = end;
			let lookahead = index;
			while (lookahead < length && /\s/.test(jsonText[lookahead])) {
				lookahead += 1;
			}
			if (depth === 1 && jsonText[lookahead] === ":") {
				keys.push(JSON.parse(raw));
			}
			continue;
		}
		if (char === "{" || char === "[") {
			depth += 1;
		} else if (char === "}" || char === "]") {
			depth -= 1;
		}
		index += 1;
	}

	return keys;
};
