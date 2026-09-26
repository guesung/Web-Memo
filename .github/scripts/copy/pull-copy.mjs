import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { COPY_SHEET_TABS, loadCopySheetConfig, readCopySheetTab } from "./copy-sheet.mjs";
import {
	COPY_TARGET_FILES,
	applyExtensionMessages,
	applyWebTranslations,
	flattenExtensionMessages,
	flattenWebTranslations,
	readJsonFile,
	writeJsonFile,
} from "./copy-files.mjs";

const execFileAsync = promisify(execFile);

/**
 * 시트 행과 JSON 값을 대조해 반영할 갱신 계획을 만든다.
 * @description 빈 셀은 쓰지 않고 경고만 남긴다. JSON에 없는 시트 행은 건너뛰고 경고, 시트에 없는 JSON 키는 유지하며 경고한다.
 */
export const buildCopyPullPlan = ({ existingRows, koFlat, enFlat }) => {
	const koUpdates = {};
	const enUpdates = {};
	const warnings = [];
	const sheetKeys = new Set();

	for (const row of existingRows) {
		sheetKeys.add(row.key);
		const inJson = row.key in koFlat || row.key in enFlat;
		if (!inJson) {
			warnings.push(`시트 키 '${row.key}'가 JSON에 없어 건너뜁니다.`);
			continue;
		}
		if (!row.ko) {
			warnings.push(`시트 키 '${row.key}'의 ko 셀이 비어 있어 쓰지 않습니다.`);
		} else if (row.ko !== koFlat[row.key]) {
			koUpdates[row.key] = row.ko;
		}
		if (!row.en) {
			warnings.push(`시트 키 '${row.key}'의 en 셀이 비어 있어 쓰지 않습니다.`);
		} else if (row.en !== enFlat[row.key]) {
			enUpdates[row.key] = row.en;
		}
	}

	for (const key of new Set([...Object.keys(koFlat), ...Object.keys(enFlat)])) {
		if (!sheetKeys.has(key)) {
			warnings.push(`JSON 키 '${key}'가 시트에 없습니다. copy:push 필요.`);
		}
	}

	return { koUpdates, enUpdates, warnings };
};

/** `pnpm exec biome format --write <file>`을 실행한다(웹 파일을 썼을 때만 호출). */
export const formatWithBiome = async (path) => {
	await execFileAsync("pnpm", ["exec", "biome", "format", "--write", path]);
};

/** 한 앱(web/extension)의 문구를 시트에서 JSON으로 pull한다. */
export const pullCopyForApp = async ({
	app,
	spreadsheetId,
	serviceAccount,
	fetcher,
	tokenExchanger,
	check = false,
	readJsonFile: readJson = readJsonFile,
	writeJsonFile: writeJson = writeJsonFile,
	formatFile = app === "web" ? formatWithBiome : undefined,
}) => {
	const tabTitle = COPY_SHEET_TABS[app];
	const { exists, rows } = await readCopySheetTab({
		spreadsheetId,
		serviceAccount,
		title: tabTitle,
		fetcher,
		tokenExchanger,
	});
	if (!exists) {
		return {
			status: "tab-missing",
			changedKeys: [],
			warnings: [`문구 관리 시트에 '${tabTitle}' 탭이 없습니다. copy:push를 먼저 실행하세요.`],
		};
	}

	const files = COPY_TARGET_FILES[app];
	const koJson = await readJson(files.ko);
	const enJson = await readJson(files.en);
	const koFlat = app === "web" ? flattenWebTranslations(koJson).flat : flattenExtensionMessages(koJson);
	const enFlat = app === "web" ? flattenWebTranslations(enJson).flat : flattenExtensionMessages(enJson);

	const { koUpdates, enUpdates, warnings } = buildCopyPullPlan({
		existingRows: rows,
		koFlat,
		enFlat,
	});
	const changedKeys = [...new Set([...Object.keys(koUpdates), ...Object.keys(enUpdates)])];

	if (check || changedKeys.length === 0) {
		return { status: check ? "checked" : "unchanged", changedKeys, warnings };
	}

	const apply = app === "web" ? applyWebTranslations : applyExtensionMessages;
	if (Object.keys(koUpdates).length > 0) {
		await writeJson(files.ko, apply(koJson, koUpdates));
		if (formatFile) {
			await formatFile(files.ko);
		}
	}
	if (Object.keys(enUpdates).length > 0) {
		await writeJson(files.en, apply(enJson, enUpdates));
		if (formatFile) {
			await formatFile(files.en);
		}
	}

	return { status: "updated", changedKeys, warnings };
};

const run = async () => {
	const check = process.argv.includes("--check");
	const { serviceAccount, spreadsheetId } = loadCopySheetConfig();
	let hasChanges = false;
	let hasTabMissing = false;

	for (const app of Object.keys(COPY_SHEET_TABS)) {
		const result = await pullCopyForApp({ app, spreadsheetId, serviceAccount, check });
		for (const warning of result.warnings) {
			console.warn(`[${app}] ${warning}`);
		}
		if (result.status === "tab-missing") {
			hasTabMissing = true;
			continue;
		}
		if (result.changedKeys.length > 0) {
			hasChanges = true;
			console.log(`[${app}] 바뀐 키: ${result.changedKeys.join(", ")}`);
		} else {
			console.log(`[${app}] 바뀐 키 없음`);
		}
	}

	if (hasTabMissing) {
		process.exitCode = 1;

		return;
	}
	if (check) {
		process.exitCode = hasChanges ? 1 : 0;
	}
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	try {
		await run();
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
