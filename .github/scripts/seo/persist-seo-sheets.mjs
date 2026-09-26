import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { upsertGoogleSheetTables } from "../shared/google-sheets.mjs";
import { createSeoSheetTables } from "./seo-sheets.mjs";

/**
 * SEO 분석을 쌓을 Google Sheets 스프레드시트 ID 환경 변수입니다.
 * @description GA 주간 수치(GA_SHEET_ID)와 시트를 나눕니다. 한 ID를 두 작업이 함께 쓰면 한쪽이 값을 바꿨을 때 다른 쪽이 조용히 남의 시트에 씁니다.
 */
export const SEO_SHEET_ID_ENV = "SEO_SHEET_ID";

/**
 * SEO·GSC 보고서를 분석용 Google Sheets 행으로 멱등 적재합니다.
 * @description 시트 설정이 없으면 공개 SEO 검사를 막지 않고 건너뜁니다. 설정이 있는데 API 적재가 실패하면 장기 이력 누락을 숨기지 않도록 예외를 전파합니다.
 */
export const persistSeoReportsToSheets = async ({
	spreadsheetId = process.env.SEO_SHEET_ID,
	serviceAccountJson = process.env.GA4_SERVICE_ACCOUNT_JSON,
	githubRunId = process.env.GITHUB_RUN_ID,
	githubRunAttempt = process.env.GITHUB_RUN_ATTEMPT ?? "1",
	commitSha = process.env.GITHUB_SHA ?? "",
	runUrl = createGithubRunUrl(process.env),
	stepSummaryPath = process.env.GITHUB_STEP_SUMMARY,
} = {}) => {
	if (!spreadsheetId || !serviceAccountJson) {
		const missingNames = [
			!spreadsheetId && SEO_SHEET_ID_ENV,
			!serviceAccountJson && "GA4_SERVICE_ACCOUNT_JSON",
		].filter(Boolean);
		const message = `Google Sheets 적재 건너뜀: ${missingNames.join(", ")} 없음`;
		console.warn(`::warning::${message}`);
		await appendStepSummary({ stepSummaryPath, message });

		return { status: "skipped", updatedRows: 0 };
	}
	if (!githubRunId) {
		throw new Error("GITHUB_RUN_ID가 없어 Sheets 행의 멱등 키를 만들 수 없습니다.");
	}

	const [seoReport, gscReport, aiReport] = await Promise.all([
		readJson("artifacts/seo/seo-report.json"),
		readOptionalJson("artifacts/seo/gsc-report.json"),
		readOptionalJson("artifacts/seo/ai-report.json"),
	]);
	const serviceAccount = parseServiceAccount(serviceAccountJson);
	const tables = createSeoSheetTables({
		seoReport,
		gscReport,
		aiReport,
		githubRunId,
		githubRunAttempt,
		commitSha,
		runUrl,
	});
	const result = await upsertGoogleSheetTables({
		spreadsheetId,
		serviceAccount,
		tables,
	});
	const message = `Google Sheets SEO 분석 행 ${result.updatedRows}건 적재`;
	console.log(message);
	await appendStepSummary({ stepSummaryPath, message });

	return { status: "stored", ...result };
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const readOptionalJson = async (path) => {
	try {
		return await readJson(path);
	} catch (error) {
		if (error?.code === "ENOENT") {
			return null;
		}

		throw error;
	}
};

const parseServiceAccount = (serviceAccountJson) => {
	try {
		const serviceAccount = JSON.parse(serviceAccountJson);
		if (!serviceAccount.client_email || !serviceAccount.private_key) {
			throw new Error("required fields missing");
		}

		return serviceAccount;
	} catch {
		throw new Error("GA4_SERVICE_ACCOUNT_JSON 형식이 올바르지 않습니다.");
	}
};

const createGithubRunUrl = (environment) => {
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = environment;
	if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) {
		return "";
	}

	return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
};

const appendStepSummary = async ({ stepSummaryPath, message }) => {
	if (!stepSummaryPath) {
		return;
	}

	await appendFile(stepSummaryPath, `\n## SEO 장기 이력\n\n${message}\n`);
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await persistSeoReportsToSheets();
}
