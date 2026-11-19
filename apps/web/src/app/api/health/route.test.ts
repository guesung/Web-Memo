import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.mocked(readFile).mockReset();
});

describe("GET /api/health", () => {
	it("DEPLOY_COLOR가 없으면(Vercel·로컬) 200", async () => {
		vi.stubEnv("DEPLOY_COLOR", "");
		expect((await GET()).status).toBe(200);
	});

	it("활성 색이면 200", async () => {
		vi.stubEnv("DEPLOY_COLOR", "blue");
		vi.mocked(readFile).mockResolvedValue("blue\n");
		expect((await GET()).status).toBe(200);
	});

	it("활성 색이 아니면 503", async () => {
		vi.stubEnv("DEPLOY_COLOR", "green");
		vi.mocked(readFile).mockResolvedValue("blue\n");
		expect((await GET()).status).toBe(503);
	});

	it("활성 색 파일이 없으면 200", async () => {
		vi.stubEnv("DEPLOY_COLOR", "green");
		vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
		expect((await GET()).status).toBe(200);
	});
});
