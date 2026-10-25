import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createPreviousReportOutputs,
	downloadSeoReport,
	fetchSeoArtifacts,
	findSiblingGscReport,
	main,
	selectPreviousSeoArtifact,
	writeOutputs,
} from "./find-previous-seo-report.mjs";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("selectPreviousSeoArtifact", () => {
	it("master의 유효한 이전 실행 중 가장 최신 SEO 아티팩트를 고른다", () => {
		const base = {
			expired: false,
			name: "seo-report-100",
			workflow_run: { id: 100, head_branch: "master" },
		};
		const artifacts = [
			{ ...base, id: 1, created_at: "2026-09-20T00:00:00Z" },
			{ ...base, id: 2, created_at: "2026-09-21T00:00:00Z" },
			{ ...base, id: 3, expired: true, created_at: "2026-09-22T00:00:00Z" },
			{ ...base, id: 4, name: "other", created_at: "2026-09-23T00:00:00Z" },
			{
				...base,
				id: 5,
				created_at: "2026-09-24T00:00:00Z",
				workflow_run: { id: 500, head_branch: "feature/test" },
			},
			{
				...base,
				id: 6,
				created_at: "2026-09-25T00:00:00Z",
				workflow_run: { id: 999, head_branch: "master" },
			},
		];

		expect(selectPreviousSeoArtifact({ artifacts, runId: "999" })?.id).toBe(2);
	});
});

describe("fetchSeoArtifacts", () => {
	it("인증 헤더로 GitHub API를 조회하고 응답을 반환한다", async () => {
		const requests: Array<{ url: string; authorization: string | null }> = [];
		const fetcher = async (input: URL | RequestInfo, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			requests.push({
				url: String(input),
				authorization: headers.get("authorization"),
			});

			return new Response(JSON.stringify({ artifacts: [{ id: 1 }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};

		const artifacts = await fetchSeoArtifacts({
			repository: "guesung/Web-Memo",
			token: "secret",
			fetcher,
			apiUrl: "https://api.example.test",
		});

		expect(artifacts).toEqual([{ id: 1 }]);
		expect(requests[0]).toEqual({
			url: "https://api.example.test/repos/guesung/Web-Memo/actions/artifacts?per_page=100&page=1",
			authorization: "Bearer secret",
		});
	});

	it("API 오류에 응답 본문이나 토큰을 노출하지 않는다", async () => {
		const fetcher = async () =>
			new Response("sensitive response", { status: 500 });

		await expect(
			fetchSeoArtifacts({
				repository: "guesung/Web-Memo",
				token: "secret-token",
				fetcher,
			}),
		).rejects.toThrow("HTTP 500");
		await expect(
			fetchSeoArtifacts({
				repository: "guesung/Web-Memo",
				token: "secret-token",
				fetcher,
			}),
		).rejects.not.toThrow(/secret|sensitive/);
	});
});

describe("downloadSeoReport", () => {
	it("아티팩트를 해제한 뒤 중첩된 SEO 보고서 경로를 찾는다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-artifact-test-"));
		const extractor = async ({ destination }: { destination: string }) => {
			await mkdir(join(destination, "seo"), { recursive: true });
			await writeFile(join(destination, "seo", "seo-report.json"), "{}");
		};

		const reportPath = await downloadSeoReport({
			artifact: { archive_download_url: "https://example.test/archive" },
			token: "secret",
			fetcher: async () => new Response(new Uint8Array([1, 2, 3])),
			extractor,
			createTempDirectory: async () => directory,
		});

		expect(reportPath).toBe(join(directory, "extracted", "seo", "seo-report.json"));
	});
});

describe("findSiblingGscReport", () => {
	it("SEO 보고서 옆에 GSC 보고서가 있으면 그 경로를 돌려준다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-artifact-test-"));
		await writeFile(join(directory, "seo-report.json"), "{}");
		await writeFile(join(directory, "gsc-report.json"), "{}");

		expect(await findSiblingGscReport(join(directory, "seo-report.json"))).toBe(
			join(directory, "gsc-report.json"),
		);
	});

	it("GSC 보고서가 없으면 null을 돌려준다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-artifact-test-"));
		await writeFile(join(directory, "seo-report.json"), "{}");

		expect(await findSiblingGscReport(join(directory, "seo-report.json"))).toBeNull();
	});
});

describe("createPreviousReportOutputs", () => {
	it("GSC 보고서가 함께 있으면 두 경로를 모두 output으로 넘긴다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-artifact-test-"));
		await writeFile(join(directory, "seo-report.json"), "{}");
		await writeFile(join(directory, "gsc-report.json"), "{}");

		expect(await createPreviousReportOutputs(join(directory, "seo-report.json"))).toEqual({
			found: "true",
			baseline_status: "available",
			SEO_PREVIOUS_REPORT: join(directory, "seo-report.json"),
			SEO_PREVIOUS_GSC_REPORT: join(directory, "gsc-report.json"),
		});
	});

	it("GSC 보고서가 없으면 GSC 경로를 넘기지 않는다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-artifact-test-"));
		await writeFile(join(directory, "seo-report.json"), "{}");

		expect(
			await createPreviousReportOutputs(join(directory, "seo-report.json")),
		).not.toHaveProperty("SEO_PREVIOUS_GSC_REPORT");
	});
});

describe("writeOutputs", () => {
	it("GITHUB_OUTPUT 형식으로 검색 결과를 기록한다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-output-test-"));
		const outputPath = join(directory, "output");
		await writeFile(outputPath, "");

		await writeOutputs(
			{ found: "true", SEO_PREVIOUS_REPORT: "/tmp/report.json" },
			outputPath,
		);

		expect(await readFile(outputPath, "utf8")).toBe(
			"found=true\nSEO_PREVIOUS_REPORT=/tmp/report.json\n",
		);
	});
});

describe("main", () => {
	it("필수 환경변수가 없으면 found=false로 안전하게 종료한다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-main-test-"));
		const outputPath = join(directory, "output");
		await writeFile(outputPath, "");
		vi.stubEnv("GITHUB_OUTPUT", outputPath);
		vi.stubEnv("GITHUB_REPOSITORY", "");
		vi.stubEnv("GITHUB_TOKEN", "");
		vi.stubEnv("GITHUB_RUN_ID", "");
		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		await main();

		expect(await readFile(outputPath, "utf8")).toBe(
			"found=false\nbaseline_status=failed\n",
		);
	});

	it("API가 실패해도 민감한 응답을 출력하지 않고 found=false로 종료한다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-main-test-"));
		const outputPath = join(directory, "output");
		await writeFile(outputPath, "");
		vi.stubEnv("GITHUB_OUTPUT", outputPath);
		vi.stubEnv("GITHUB_REPOSITORY", "guesung/Web-Memo");
		vi.stubEnv("GITHUB_TOKEN", "secret-token");
		vi.stubEnv("GITHUB_RUN_ID", "123");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("sensitive response", { status: 500 })),
		);
		const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		await main();

		expect(await readFile(outputPath, "utf8")).toBe(
			"found=false\nbaseline_status=failed\n",
		);
		expect(warning.mock.calls.flat().join(" ")).not.toMatch(
			/secret-token|sensitive response/,
		);
	});

	it("정상 조회에서 이전 아티팩트가 없으면 missing으로 구분한다", async () => {
		const directory = await mkdtemp(join(tmpdir(), "seo-main-test-"));
		const outputPath = join(directory, "output");
		await writeFile(outputPath, "");
		vi.stubEnv("GITHUB_OUTPUT", outputPath);
		vi.stubEnv("GITHUB_REPOSITORY", "guesung/Web-Memo");
		vi.stubEnv("GITHUB_TOKEN", "token");
		vi.stubEnv("GITHUB_RUN_ID", "123");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(JSON.stringify({ artifacts: [] }), { status: 200 }),
			),
		);
		vi.spyOn(console, "log").mockImplementation(() => undefined);

		await main();

		expect(await readFile(outputPath, "utf8")).toBe(
			"found=false\nbaseline_status=missing\n",
		);
	});
});
