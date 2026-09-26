import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { ensureGoogleSheetTab, writeGoogleSheetRanges } from "../shared/google-sheets.mjs";
import {
	COPY_SHEET_HEADER,
	COPY_SHEET_TABS,
	loadCopySheetConfig,
	readCopySheetTab,
} from "./copy-sheet.mjs";
import {
	COPY_TARGET_FILES,
	flattenExtensionMessages,
	flattenWebTranslations,
	readJsonFile,
} from "./copy-files.mjs";
import { scanUsages } from "./scan-usages.mjs";

/** 사용처가 하나도 없는 키에 쓰는 사용 위치 값. */
export const UNKNOWN_USAGE_LABEL = "미확인 (동적 또는 미사용)";

/** 시트에만 남아 JSON에서 사라진 키에 쓰는 사용 위치 값. */
export const MISSING_IN_JSON_LABEL = "JSON에 없음";

const quoteTitle = (title) => `'${title.replaceAll("'", "''")}'`;

/** 사용처 목록을 `라벨 (파일:라인)` 줄바꿈 연결 문자열로 만든다. 같은 라벨이 중복이면 하나만 남긴다. */
export const buildLocationCell = (usageList) => {
	if (!usageList || usageList.length === 0) {
		return UNKNOWN_USAGE_LABEL;
	}
	const lines = usageList.map(({ location, file, line }) => `${location} (${file}:${line})`);

	return [...new Set(lines)].join("\n");
};

/**
 * JSON 키와 시트의 기존 행을 대조해, 시트에 반영할 범위 쓰기 계획을 만든다.
 * @description 새 키는 A열부터 한 행 추가, 기존 키는 D열(사용 위치)만 갱신한다. B·C·E열은 건드리지 않는다.
 */
export const buildCopyPushPlan = ({ tabTitle, existingRows, koFlat, enFlat, usages }) => {
	const jsonKeys = new Set([...Object.keys(koFlat), ...Object.keys(enFlat)]);
	const existingByKey = new Map(existingRows.map((row) => [row.key, row]));
	const ranges = [];
	let added = 0;
	let updated = 0;
	let nextRow =
		existingRows.reduce((max, row) => Math.max(max, row.rowNumber), 1) + 1;

	for (const key of jsonKeys) {
		const locationCell = buildLocationCell(usages[key]);
		const existing = existingByKey.get(key);
		if (existing) {
			ranges.push({
				range: `${quoteTitle(tabTitle)}!D${existing.rowNumber}`,
				values: [[locationCell]],
			});
			updated += 1;
		} else {
			ranges.push({
				range: `${quoteTitle(tabTitle)}!A${nextRow}`,
				values: [[key, koFlat[key] ?? "", enFlat[key] ?? "", locationCell]],
			});
			nextRow += 1;
			added += 1;
		}
	}

	for (const existing of existingRows) {
		if (!jsonKeys.has(existing.key)) {
			ranges.push({
				range: `${quoteTitle(tabTitle)}!D${existing.rowNumber}`,
				values: [[MISSING_IN_JSON_LABEL]],
			});
			updated += 1;
		}
	}

	return { ranges, added, updated };
};

/** 한 앱(web/extension)의 문구를 시트에 push한다. */
export const pushCopyForApp = async ({
	app,
	spreadsheetId,
	serviceAccount,
	fetcher,
	tokenExchanger,
	readJsonFile: readJson = readJsonFile,
	scanUsages: scan = scanUsages,
	repoRoot = process.cwd(),
}) => {
	const tabTitle = COPY_SHEET_TABS[app];
	const files = COPY_TARGET_FILES[app];
	const koJson = await readJson(files.ko);
	const enJson = await readJson(files.en);
	const { flat: koFlat, excludedKeys: koExcluded } =
		app === "web"
			? flattenWebTranslations(koJson)
			: { flat: flattenExtensionMessages(koJson), excludedKeys: [] };
	const { flat: enFlat, excludedKeys: enExcluded } =
		app === "web"
			? flattenWebTranslations(enJson)
			: { flat: flattenExtensionMessages(enJson), excludedKeys: [] };
	const excludedKeys = [...new Set([...koExcluded, ...enExcluded])];

	const { exists, rows } = await readCopySheetTab({
		spreadsheetId,
		serviceAccount,
		title: tabTitle,
		fetcher,
		tokenExchanger,
	});
	if (!exists) {
		await ensureGoogleSheetTab({
			spreadsheetId,
			serviceAccount,
			title: tabTitle,
			headers: COPY_SHEET_HEADER,
			fetcher,
			tokenExchanger,
		});
	}

	const usages = scan({ repoRoot })[app];
	const plan = buildCopyPushPlan({ tabTitle, existingRows: rows, koFlat, enFlat, usages });
	await writeGoogleSheetRanges({
		spreadsheetId,
		serviceAccount,
		ranges: plan.ranges,
		fetcher,
		tokenExchanger,
	});

	return { added: plan.added, updated: plan.updated, excludedKeys };
};

const run = async () => {
	const { serviceAccount, spreadsheetId } = loadCopySheetConfig();
	for (const app of Object.keys(COPY_SHEET_TABS)) {
		const result = await pushCopyForApp({ app, spreadsheetId, serviceAccount });
		console.log(`[${app}] 추가 ${result.added}건 · 갱신 ${result.updated}건`);
		if (result.excludedKeys.length > 0) {
			console.log(`[${app}] 제외된 비문자열 키: ${result.excludedKeys.join(", ")}`);
		}
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
