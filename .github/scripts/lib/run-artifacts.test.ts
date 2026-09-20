import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildArtifactDownloadUrl,
	fetchRunArtifacts,
	pickExtensionArtifact,
} from "./run-artifacts.mjs";

describe("pickExtensionArtifact", () => {
	it("압축을 푼 확장 아티팩트를 고른다", () => {
		const picked = pickExtensionArtifact([
			{ id: 1, name: "store-package-extension-production-v1.10.14" },
			{ id: 2, name: "extension-production-v1.10.14" },
		]);

		expect(picked).toEqual({ id: 2, name: "extension-production-v1.10.14" });
	});

	// 스토어 제출용 zip은 zip을 한 번 더 감싼 것이라 받아서 바로 로드할 수 없다
	it("스토어 제출용 zip 아티팩트만 있으면 고르지 않는다", () => {
		expect(
			pickExtensionArtifact([
				{ id: 1, name: "store-package-extension-production-v1.10.14" },
			]),
		).toBeNull();
	});

	it("보관 기간이 지난 아티팩트는 링크가 죽어 있으므로 고르지 않는다", () => {
		expect(
			pickExtensionArtifact([
				{ id: 2, name: "extension-production-v1.10.14", expired: true },
			]),
		).toBeNull();
	});

	it("확장과 무관한 아티팩트만 있으면 null이다", () => {
		expect(pickExtensionArtifact([{ id: 3, name: "ios-build-ci" }])).toBeNull();
		expect(pickExtensionArtifact([])).toBeNull();
	});
});

describe("buildArtifactDownloadUrl", () => {
	it("실행과 아티팩트를 가리키는 GitHub 웹 주소를 만든다", () => {
		expect(
			buildArtifactDownloadUrl({
				serverUrl: "https://github.com",
				repository: "guesung/Web-Memo",
				runId: "123",
				artifactId: 456,
			}),
		).toBe("https://github.com/guesung/Web-Memo/actions/runs/123/artifacts/456");
	});
});

describe("fetchRunArtifacts", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("이 실행의 아티팩트 목록 API를 토큰과 함께 부른다", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ artifacts: [{ id: 2, name: "extension-x" }] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const artifacts = await fetchRunArtifacts({
			repository: "guesung/Web-Memo",
			runId: "123",
			token: "t0ken",
			apiUrl: "https://api.example.test",
		});

		expect(artifacts).toEqual([{ id: 2, name: "extension-x" }]);
		expect(fetchMock.mock.calls[0][0]).toBe(
			"https://api.example.test/repos/guesung/Web-Memo/actions/runs/123/artifacts?per_page=100",
		);
		expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
			"Bearer t0ken",
		);
	});

	it("응답이 실패하면 던진다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 403 }),
		);

		await expect(
			fetchRunArtifacts({
				repository: "guesung/Web-Memo",
				runId: "123",
				token: "t0ken",
				apiUrl: "https://api.example.test",
			}),
		).rejects.toThrow("403");
	});

	it("artifacts 필드가 없으면 빈 목록이다", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
		);

		await expect(
			fetchRunArtifacts({
				repository: "guesung/Web-Memo",
				runId: "123",
				token: "t0ken",
				apiUrl: "https://api.example.test",
			}),
		).resolves.toEqual([]);
	});
});
