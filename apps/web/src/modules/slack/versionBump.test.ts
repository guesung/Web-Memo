import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commitVersionBump } from "./github";

describe("버전 커밋 생성", () => {
	beforeEach(() => {
		vi.stubEnv("GITHUB_DISPATCH_TOKEN", "test-token");
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("검증한 기본 브랜치가 이동했으면 쓰기 요청을 하지 않는다", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ object: { sha: "moved" } }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			commitVersionBump({
				appVersion: "2.0.0",
				requestedBy: "user",
				expectedBaseSha: "base",
			}),
		).rejects.toThrow("검증 이후 master가");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("두 트랙을 같은 SHA에서 읽어 한 커밋으로 갱신한다", async () => {
		const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
			const path = new URL(url).pathname;
			let result: unknown;
			if (path.endsWith("/git/ref/heads/master")) {
				result = { object: { sha: "base" } };
			} else if (path.endsWith("/git/commits/base")) {
				result = { tree: { sha: "base-tree" } };
			} else if (path.includes("/contents/")) {
				expect(new URL(url).searchParams.get("ref")).toBe("base");
				return {
					ok: true,
					text: async () =>
						path.endsWith("app.json")
							? '{"expo":{"version":"1.0.0"}}'
							: '{"version":"1.0.0"}',
				};
			} else if (path.endsWith("/git/blobs")) {
				result = { sha: "blob" };
			} else if (path.endsWith("/git/trees")) {
				const body = JSON.parse(String(init.body));
				expect(body.base_tree).toBe("base-tree");
				expect(body.tree.map((entry: { path: string }) => entry.path)).toEqual([
					"apps/app/app.json",
					"apps/chrome-extension/package.json",
				]);
				result = { sha: "tree" };
			} else if (path.endsWith("/git/commits")) {
				expect(JSON.parse(String(init.body))).toMatchObject({
					parents: ["base"],
					tree: "tree",
				});
				result = { sha: "commit" };
			} else if (path.endsWith("/git/refs/heads/master")) {
				expect(init.method).toBe("PATCH");
				expect(JSON.parse(String(init.body))).toEqual({ sha: "commit" });
				result = {};
			} else {
				throw new Error(`예상하지 못한 요청: ${path}`);
			}

			return { ok: true, json: async () => result };
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			commitVersionBump({
				appVersion: "2.0.0",
				extensionVersion: "3.0.0",
				requestedBy: "user",
				expectedBaseSha: "base",
			}),
		).resolves.toBe("commit");
		expect(fetchMock).toHaveBeenCalledTimes(9);
		const blobs = fetchMock.mock.calls.filter(([url]) =>
			url.endsWith("/git/blobs"),
		);
		expect(
			blobs.map(([, init]) => JSON.parse(String(init.body)).content),
		).toEqual(['{"expo":{"version":"2.0.0"}}', '{"version":"3.0.0"}']);
	});
});
