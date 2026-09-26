import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { readGoogleSheetValues } from "../shared/google-sheets.mjs";

/** 문구 관리 시트의 탭 이름. */
export const COPY_SHEET_TABS = { web: "web", extension: "extension" };

/** 문구 관리 시트가 요구하는 헤더(앞 5열). 오른쪽에 열이 더 있어도 허용한다. */
export const COPY_SHEET_HEADER = ["키", "ko", "en", "사용 위치", "맥락"];

const ENV_LOCAL_PATH = "apps/web/.env.local";

/**
 * `GA4_SERVICE_ACCOUNT_JSON`·`COPY_SHEET_ID`를 셸 환경변수 → `apps/web/.env.local` 순서로 읽는다.
 * @description 둘 중 하나라도 없으면 `pnpm env:pull` 안내를 담아 던진다. 시크릿 값은 반환값 외에 로그에 찍지 않는다.
 */
export const loadCopySheetConfig = ({
	env = process.env,
	repoRoot = process.cwd(),
	readFile = readFileSync,
} = {}) => {
	let serviceAccountJson = env.GA4_SERVICE_ACCOUNT_JSON;
	let spreadsheetId = env.COPY_SHEET_ID;

	if (!serviceAccountJson || !spreadsheetId) {
		const fromEnvLocal = readEnvLocal({ repoRoot, readFile });
		serviceAccountJson ??= fromEnvLocal.GA4_SERVICE_ACCOUNT_JSON;
		spreadsheetId ??= fromEnvLocal.COPY_SHEET_ID;
	}

	if (!serviceAccountJson || !spreadsheetId) {
		throw new Error(
			"GA4_SERVICE_ACCOUNT_JSON·COPY_SHEET_ID를 찾을 수 없습니다. pnpm env:pull 후 apps/web/.env.local에 COPY_SHEET_ID를 설정하세요.",
		);
	}

	let serviceAccount;
	try {
		serviceAccount = parseServiceAccountJson(serviceAccountJson);
		if (!serviceAccount.client_email || !serviceAccount.private_key) {
			throw new Error("required fields missing");
		}
	} catch {
		throw new Error("GA4_SERVICE_ACCOUNT_JSON 형식이 올바르지 않습니다.");
	}

	return { serviceAccount, spreadsheetId };
};

const readEnvLocal = ({ repoRoot, readFile }) => {
	let content;
	try {
		content = readFile(resolve(repoRoot, ENV_LOCAL_PATH), "utf8");
	} catch {
		return {};
	}
	const values = {};
	for (const line of content.split("\n")) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
		if (!match) {
			continue;
		}
		const [, key, rawValue] = match;
		values[key] = parseEnvValue(rawValue);
	}

	return values;
};

// vercel env pull은 백슬래시를 이스케이프하지 않아 private_key의 \n과 JSON 구조의 줄바꿈이
// 둘 다 \n으로 적힌다. 풀고 나면 문자열 안에 실제 줄바꿈이 남으므로, 실패하면 그것만 되돌려 다시 파싱한다.
const parseServiceAccountJson = (text) => {
	try {
		return JSON.parse(text);
	} catch {
		let isInString = false;
		let sanitized = "";
		for (let index = 0; index < text.length; index += 1) {
			const char = text[index];
			if (char === '"' && text[index - 1] !== "\\") {
				isInString = !isInString;
			}
			sanitized += isInString && char === "\n" ? "\\n" : char;
		}

		return JSON.parse(sanitized);
	}
};

// 큰따옴표 값은 dotenv 규칙(\n·\"·\\)으로 한 번에 푼다.
const parseEnvValue = (rawValue) => {
	if (rawValue.length >= 2 && rawValue.startsWith('"') && rawValue.endsWith('"')) {
		return rawValue
			.slice(1, -1)
			.replace(/\\(.)/g, (_, char) => (char === "n" ? "\n" : char));
	}
	if (rawValue.length >= 2 && rawValue.startsWith("'") && rawValue.endsWith("'")) {
		return rawValue.slice(1, -1);
	}

	return rawValue;
};

/**
 * 시트 헤더가 `COPY_SHEET_HEADER`와 앞 5열이 일치하는지 검사한다.
 * @description 오른쪽에 추가 열이 있어도 허용한다.
 */
export const validateCopySheetHeader = (header, tabTitle) => {
	const prefix = (header ?? []).slice(0, COPY_SHEET_HEADER.length);
	const matches =
		prefix.length === COPY_SHEET_HEADER.length &&
		prefix.every((value, index) => value === COPY_SHEET_HEADER[index]);
	if (!matches) {
		throw new Error(
			`문구 관리 시트 '${tabTitle}' 탭 헤더가 예상과 다릅니다. 기대: ${COPY_SHEET_HEADER.join(", ")}`,
		);
	}
};

/**
 * 시트 값(헤더 포함)을 `{key, ko, en, location, context, rowNumber}` 행으로 파싱한다.
 * @description 같은 키가 두 번 이상 나오면 키와 행 번호를 담아 던진다. 빈 키 행은 건너뛴다.
 */
export const parseCopySheetRows = (values, tabTitle) => {
	const [header, ...body] = values;
	validateCopySheetHeader(header, tabTitle);

	const rows = [];
	const rowNumberByKey = new Map();
	for (const [offset, cells] of body.entries()) {
		const key = cells[0];
		if (!key) {
			continue;
		}
		const rowNumber = offset + 2;
		if (rowNumberByKey.has(key)) {
			throw new Error(
				`문구 관리 시트 '${tabTitle}' 탭에 키 '${key}'가 ${rowNumberByKey.get(key)}행과 ${rowNumber}행에 중복됩니다.`,
			);
		}
		rowNumberByKey.set(key, rowNumber);
		rows.push({
			key,
			ko: cells[1] ?? "",
			en: cells[2] ?? "",
			location: cells[3] ?? "",
			context: cells[4] ?? "",
			rowNumber,
		});
	}

	return rows;
};

/**
 * 문구 관리 시트의 한 탭을 읽어 파싱한 행 목록을 돌려준다.
 * @description API 실패는 상태 코드를 담아 던지고, 403은 서비스 계정 공유 안내를 덧붙인다.
 */
export const readCopySheetTab = async ({
	spreadsheetId,
	serviceAccount,
	title,
	fetcher,
	tokenExchanger,
	sleep,
}) => {
	let values;
	try {
		values = await readGoogleSheetValues({
			spreadsheetId,
			serviceAccount,
			title,
			fetcher,
			tokenExchanger,
			...(sleep ? { sleep } : {}),
		});
	} catch (error) {
		const status = extractStatus(error);
		if (status === 400) {
			return { exists: false, rows: [] };
		}

		throw translateSheetError({ status, error, serviceAccount });
	}
	if (values.length === 0) {
		return { exists: false, rows: [] };
	}

	return { exists: true, rows: parseCopySheetRows(values, title) };
};

const extractStatus = (error) => {
	const statusMatch = /\((\d+)\)$/.exec(error.message ?? "");

	return statusMatch ? Number(statusMatch[1]) : undefined;
};

const translateSheetError = ({ status, error, serviceAccount }) => {
	if (status === undefined) {
		return error;
	}
	if (status === 403) {
		return new Error(
			`문구 관리 시트 API 요청이 거부됐습니다(403). 시트를 서비스 계정(${serviceAccount?.client_email ?? "client_email"})에 편집자로 공유하세요.`,
		);
	}

	return new Error(`문구 관리 시트 API 요청이 실패했습니다(${status}).`);
};
