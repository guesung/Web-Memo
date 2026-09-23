import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	collectGscReport,
	compareGscInspections,
	createGscMarkdown,
} from "./lib/seo-gsc.mjs";

const readSitemapUrls = async () => {
	const source = JSON.parse(
		await readFile("artifacts/seo/seo-report.json", "utf8"),
	);

	return [
		...new Set(
			source.pages
				.filter((page) => page.kind === "page")
				.map((page) => page.url),
		),
	];
};

// 예약 실행이 KST 09:17이라 PT로는 아직 일요일입니다. PT로 판정하면 주간 리포트가 화요일에 나갑니다.
const isKoreanMonday = (now) =>
	new Intl.DateTimeFormat("en-US", {
		timeZone: "Asia/Seoul",
		weekday: "short",
	}).format(now) === "Mon";

const readPreviousGscReport = async (path) => {
	if (!path) {
		return null;
	}
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch {
		return null;
	}
};

/** 공개 SEO 검사 URL로 GSC 리포트를 만들고 실패 여부를 프로세스 상태에 반영합니다. */
export const runGscCheck = async ({
	serviceAccountJson = process.env.GSC_SERVICE_ACCOUNT_JSON,
	weekly,
	now = new Date(),
	urls,
	previousReportPath = process.env.SEO_PREVIOUS_GSC_REPORT,
} = {}) => {
	let sitemapUrls = urls;
	if (!sitemapUrls) {
		try {
			sitemapUrls = await readSitemapUrls();
		} catch {
			sitemapUrls = [];
		}
	}
	const report = await collectGscReport({
		serviceAccountJson,
		urls: sitemapUrls,
		weekly:
			weekly ??
			(process.argv.includes("--weekly") ||
				process.env.SEO_GSC_WEEKLY === "true" ||
				isKoreanMonday(now)),
		now,
	});
	if (serviceAccountJson && sitemapUrls.length === 0) {
		report.status = "failed";
		report.failures.push({
			scope: "setup",
			code: "missing_sitemap_urls",
			message: "공개 SEO 검사에서 sitemap URL을 읽지 못했습니다.",
		});
	}
	if (report.status !== "skipped") {
		report.indexChanges = compareGscInspections({
			currentReport: report,
			previousReport: await readPreviousGscReport(previousReportPath),
		});
	}
	const markdown = createGscMarkdown(report);
	await mkdir("artifacts/seo", { recursive: true });
	await writeFile(
		"artifacts/seo/gsc-report.json",
		`${JSON.stringify(report, null, 2)}\n`,
	);
	await writeFile("artifacts/seo/gsc-report.md", markdown);
	if (process.env.GITHUB_STEP_SUMMARY) {
		await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
	}
	console.log(`GSC 검사 완료: ${report.status}`);
	if (report.status === "failed") {
		process.exitCode = 1;
	}

	return report;
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await runGscCheck();
}
