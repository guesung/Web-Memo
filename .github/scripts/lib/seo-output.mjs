import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import {
	compareSeoReports,
	createSeoHistoryMarkdown,
	parseSeoReportJson,
} from "./seo-history.mjs";

/** SEO JSON·Markdown 보고서에 이전 실행 비교 결과를 포함해 저장합니다. */
export const writeSeoReport = async ({
	report,
	markdown,
	previousReportPath = process.env.SEO_PREVIOUS_REPORT,
	baselineStatus = process.env.SEO_BASELINE_STATUS,
	stepSummaryPath = process.env.GITHUB_STEP_SUMMARY,
}) => {
	const history = await compareWithPreviousReport({
		currentReport: report,
		previousReportPath,
		baselineStatus,
	});
	report.history = history;
	const markdownWithHistory = `${markdown}\n${createSeoHistoryMarkdown(history)}`;
	await mkdir("artifacts/seo", { recursive: true });
	await writeFile(
		"artifacts/seo/seo-report.json",
		`${JSON.stringify(report, null, 2)}\n`,
	);
	await writeFile("artifacts/seo/seo-report.md", markdownWithHistory);
	if (stepSummaryPath) {
		await appendFile(stepSummaryPath, markdownWithHistory);
	}

	return history;
};

/** Actions에서 전달한 이전 보고서와 현재 보고서의 이슈 변화를 비교합니다. */
const compareWithPreviousReport = async ({
	currentReport,
	previousReportPath,
	baselineStatus,
}) => {
	if (baselineStatus === "failed") {
		return {
			baselineStatus: "failed",
			delta: { new: [], persistent: [], resolved: [], unobservable: [] },
		};
	}
	if (!previousReportPath) {
		return compareSeoReports({ currentReport, previousReport: null });
	}
	try {
		const parsed = parseSeoReportJson(
			await readFile(previousReportPath, "utf8"),
		);
		if (parsed.baselineStatus !== "compatible") {
			return {
				baselineStatus: parsed.baselineStatus,
				delta: { new: [], persistent: [], resolved: [], unobservable: [] },
			};
		}

		return compareSeoReports({
			currentReport,
			previousReport: parsed.report,
		});
	} catch {
		return {
			baselineStatus: "incompatible",
			delta: { new: [], persistent: [], resolved: [], unobservable: [] },
		};
	}
};
