import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
	COPY_TARGET_FILES,
	findDuplicateTopLevelKeys,
	flattenExtensionMessages,
	flattenWebTranslations,
} from "./copy-files.mjs";
import { scanUsages } from "./scan-usages.mjs";

/**
 * 웹·확장 문구 JSON의 일관성을 검사한다(시트·네트워크·node_modules 없이 동작).
 * @description ko/en 키 집합 차이, 소스에서 쓰는 리터럴 키의 JSON 누락, 확장 JSON 원문의 최상위 키 중복을 본다.
 */
export const checkCopyKeys = async ({ repoRoot = process.cwd() } = {}) => {
	const violations = [];

	const webKoJson = JSON.parse(await readFile(resolve(repoRoot, COPY_TARGET_FILES.web.ko), "utf8"));
	const webEnJson = JSON.parse(await readFile(resolve(repoRoot, COPY_TARGET_FILES.web.en), "utf8"));
	const extensionKoText = await readFile(resolve(repoRoot, COPY_TARGET_FILES.extension.ko), "utf8");
	const extensionEnText = await readFile(resolve(repoRoot, COPY_TARGET_FILES.extension.en), "utf8");
	const extensionKoJson = JSON.parse(extensionKoText);
	const extensionEnJson = JSON.parse(extensionEnText);

	const webKoFlat = flattenWebTranslations(webKoJson).flat;
	const webEnFlat = flattenWebTranslations(webEnJson).flat;
	const extensionKoFlat = flattenExtensionMessages(extensionKoJson);
	const extensionEnFlat = flattenExtensionMessages(extensionEnJson);

	violations.push(...keySetDiffViolations("web", webKoFlat, webEnFlat));
	violations.push(...keySetDiffViolations("extension", extensionKoFlat, extensionEnFlat));

	const webAllPaths = new Set([
		...collectAllDotPaths(webKoJson),
		...collectAllDotPaths(webEnJson),
	]);
	const extensionKeySet = new Set([
		...Object.keys(extensionKoFlat),
		...Object.keys(extensionEnFlat),
	]);

	const usages = scanUsages({ repoRoot });
	for (const [key, occurrences] of Object.entries(usages.web)) {
		if (!webAllPaths.has(key)) {
			for (const { file, line } of occurrences) {
				violations.push(`웹 키 '${key}'가 JSON에 없습니다 (${file}:${line})`);
			}
		}
	}
	for (const [key, occurrences] of Object.entries(usages.extension)) {
		if (!extensionKeySet.has(key)) {
			for (const { file, line } of occurrences) {
				violations.push(`확장 키 '${key}'가 JSON에 없습니다 (${file}:${line})`);
			}
		}
	}

	for (const [label, text] of [
		[COPY_TARGET_FILES.extension.ko, extensionKoText],
		[COPY_TARGET_FILES.extension.en, extensionEnText],
	]) {
		const duplicates = findDuplicateTopLevelKeys(text);
		for (const key of duplicates) {
			violations.push(`확장 JSON '${label}'에 중복 키 '${key}'가 있습니다`);
		}
	}

	return violations;
};

const keySetDiffViolations = (app, koFlat, enFlat) => {
	const violations = [];
	const koKeys = new Set(Object.keys(koFlat));
	const enKeys = new Set(Object.keys(enFlat));
	for (const key of koKeys) {
		if (!enKeys.has(key)) {
			violations.push(`${app} 키 '${key}'가 en에는 없습니다`);
		}
	}
	for (const key of enKeys) {
		if (!koKeys.has(key)) {
			violations.push(`${app} 키 '${key}'가 ko에는 없습니다`);
		}
	}

	return violations;
};

/** 객체를 훑어 모든 깊이의 키 경로(점 경로)를 모은다. 존재 여부만 확인하는 용도라 leaf 타입은 가리지 않는다. */
export const collectAllDotPaths = (node, prefix = []) => {
	const paths = [];
	for (const key of Object.keys(node)) {
		const path = [...prefix, key];
		paths.push(path.join("."));
		const value = node[key];
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			paths.push(...collectAllDotPaths(value, path));
		}
	}

	return paths;
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	const violations = await checkCopyKeys();
	if (violations.length > 0) {
		for (const violation of violations) {
			console.error(violation);
		}
		process.exitCode = 1;
	} else {
		console.log("문구 키 검사 통과");
	}
}
