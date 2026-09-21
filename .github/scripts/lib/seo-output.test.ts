import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeSeoReport } from "./seo-output.mjs";

vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn(),
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("SEO 보고서 저장", () => {
	it("이전 보고서와 호환되면 이슈 변화를 JSON과 Markdown에 남긴다", async () => {
		vi.mocked(readFile).mockResolvedValue(
			JSON.stringify({
				schemaVersion: 2,
				pages: [
					{
						kind: "page",
						url: "https://www.webmemo.xyz/ko/introduce",
						agent: "pc",
						status: 200,
						issues: [],
					},
				],
			}),
		);
		const report = {
			schemaVersion: 2,
			pages: [
				{
					kind: "page",
					url: "https://www.webmemo.xyz/ko/introduce",
					agent: "pc",
					status: 200,
					issues: [
						{
							severity: "warning",
							code: "TITLE_MISSING",
							field: "title",
							message: "title 누락",
						},
					],
				},
			],
		};

		const history = await writeSeoReport({
			report,
			markdown: "# SEO\n",
			previousReportPath: "/tmp/previous.json",
		});

		expect(history.baselineStatus).toBe("compatible");
		expect(history.delta.new).toHaveLength(1);
		expect(mkdir).toHaveBeenCalledWith("artifacts/seo", { recursive: true });
		expect(writeFile).toHaveBeenCalledWith(
			"artifacts/seo/seo-report.md",
			expect.stringContaining("신규 1건"),
		);
		expect(appendFile).not.toHaveBeenCalled();
	});

	it("이전 보고서를 읽지 못하면 해소로 오판하지 않는다", async () => {
		vi.mocked(readFile).mockRejectedValue(new Error("missing"));
		const report = { schemaVersion: 2, pages: [] };

		const history = await writeSeoReport({
			report,
			markdown: "# SEO\n",
			previousReportPath: "/tmp/missing.json",
		});

		expect(history).toEqual({
			baselineStatus: "incompatible",
			delta: { new: [], persistent: [], resolved: [], unobservable: [] },
		});
	});

	it("기준선 조회 실패를 최초 실행과 구분해 보고한다", async () => {
		const report = { schemaVersion: 2, pages: [] };

		const history = await writeSeoReport({
			report,
			markdown: "# SEO\n",
			baselineStatus: "failed",
		});

		expect(history.baselineStatus).toBe("failed");
		expect(readFile).not.toHaveBeenCalled();
	});
});
