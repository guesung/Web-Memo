// @ts-nocheck — .mjs 스크립트를 직접 import 하는 테스트라 타입 선언이 없습니다.
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
}));
vi.mock("./lib/seo-gsc.mjs", async (importOriginal) => {
	const actual = await importOriginal();

	return {
		collectGscReport: vi.fn(async ({ serviceAccountJson, urls }) => ({
			generatedAt: "2026-09-22T00:00:00.000Z",
			status: serviceAccountJson ? "passed" : "skipped",
			siteUrl: "https://www.webmemo.xyz/",
			inspections: urls.map((url) => ({ url, verdict: "NEUTRAL" })),
			weekly: null,
			failures: [],
		})),
		// 비교는 실제 구현을 써서 CLI와 판정의 연결을 검증합니다.
		compareGscInspections: vi.fn(actual.compareGscInspections),
		createGscMarkdown: vi.fn(() => "# GSC\n"),
	};
});

import { runGscCheck } from "./check-gsc.mjs";
import { collectGscReport, compareGscInspections } from "./lib/seo-gsc.mjs";

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	process.exitCode = 0;
});

describe("GSC CLI", () => {
	it("공개 SEO 결과에서 sitemap URL을 중복 없이 읽어 두 리포트를 저장한다", async () => {
		readFile.mockResolvedValue(
			JSON.stringify({
				pages: [
					{ kind: "page", url: "https://www.webmemo.xyz/ko/introduce", agent: "pc" },
					{ kind: "page", url: "https://www.webmemo.xyz/ko/introduce", agent: "mobile" },
					{ kind: "robots", url: "https://www.webmemo.xyz/robots.txt" },
				],
			}),
		);

		const report = await runGscCheck({ serviceAccountJson: "{}", weekly: false });

		expect(report.inspections).toHaveLength(1);
		expect(writeFile).toHaveBeenCalledWith(
			"artifacts/seo/gsc-report.json",
			expect.stringContaining('"status": "passed"'),
		);
		expect(writeFile).toHaveBeenCalledWith("artifacts/seo/gsc-report.md", "# GSC\n");
	});

	it("Secret이 없으면 skipped 리포트를 저장하고 성공 상태를 유지한다", async () => {
		const report = await runGscCheck({ serviceAccountJson: "", urls: [], weekly: false });

		expect(report.status).toBe("skipped");
		expect(process.exitCode).toBe(0);
	});

	it("실패는 리포트를 먼저 저장한 뒤 종료 상태를 실패로 표시한다", async () => {
		readFile.mockRejectedValue(new Error("not found"));

		const report = await runGscCheck({ serviceAccountJson: "{}", weekly: false });

		expect(report.status).toBe("failed");
		expect(report.failures[0].code).toBe("missing_sitemap_urls");
		expect(writeFile).toHaveBeenCalledTimes(2);
		expect(process.exitCode).toBe(1);
	});

	it("GitHub 실행 요약 경로가 있으면 Markdown을 추가한다", async () => {
		vi.stubEnv("GITHUB_STEP_SUMMARY", "/tmp/summary.md");

		await runGscCheck({ serviceAccountJson: "", urls: [], weekly: false });

		expect(appendFile).toHaveBeenCalledWith("/tmp/summary.md", "# GSC\n");
	});

	it("한국 시간 월요일 예약 실행에서 주간 성과 모드를 활성화한다", async () => {
		await runGscCheck({
			serviceAccountJson: "",
			urls: [],
			now: new Date("2026-09-21T00:17:00Z"),
		});

		expect(collectGscReport).toHaveBeenCalledWith(
			expect.objectContaining({ weekly: true }),
		);
	});

	it("태평양 시간으로만 월요일인 한국 시간 화요일에는 주간 성과를 조회하지 않는다", async () => {
		await runGscCheck({
			serviceAccountJson: "",
			urls: [],
			now: new Date("2026-09-22T00:17:00Z"),
		});

		expect(collectGscReport).toHaveBeenCalledWith(
			expect.objectContaining({ weekly: false }),
		);
	});

	it("이전 GSC 리포트와 비교해 색인에서 빠진 URL을 리포트에 담는다", async () => {
		readFile.mockResolvedValue(
			JSON.stringify({
				inspections: [{ url: "https://www.webmemo.xyz/ko/introduce", verdict: "PASS" }],
			}),
		);

		const report = await runGscCheck({
			serviceAccountJson: "{}",
			urls: ["https://www.webmemo.xyz/ko/introduce"],
			weekly: false,
			previousReportPath: "/tmp/previous/gsc-report.json",
		});

		expect(readFile).toHaveBeenCalledWith("/tmp/previous/gsc-report.json", "utf8");
		expect(report.indexChanges.baselineStatus).toBe("compatible");
		expect(report.indexChanges.dropped).toEqual([
			expect.objectContaining({
				url: "https://www.webmemo.xyz/ko/introduce",
				previousVerdict: "PASS",
				verdict: "NEUTRAL",
			}),
		]);
	});

	it("이전 GSC 리포트가 손상됐으면 missing으로 처리한다", async () => {
		readFile.mockResolvedValue("{broken");

		const report = await runGscCheck({
			serviceAccountJson: "{}",
			urls: ["https://www.webmemo.xyz/ko/introduce"],
			weekly: false,
			previousReportPath: "/tmp/previous/gsc-report.json",
		});

		expect(report.indexChanges.baselineStatus).toBe("missing");
	});

	it("건너뛴 실행에는 색인 변화를 계산하지 않는다", async () => {
		const report = await runGscCheck({ serviceAccountJson: "", urls: [], weekly: false });

		expect(compareGscInspections).not.toHaveBeenCalled();
		expect(report.indexChanges).toBeUndefined();
	});
});
