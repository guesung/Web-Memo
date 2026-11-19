import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { SUPPORTED_LANGUAGES } from "../i18n/constant";
import { EDGE_CACHE_PATHS, isEdgeCachePath } from ".";

const manifest = JSON.parse(
	readFileSync(
		resolve(__dirname, "../../../../../infra/oracle/edge-cache-paths.json"),
		"utf8",
	),
) as { languages: string[]; paths: string[] };

describe("edgeCache", () => {
	it("infra/oracle/edge-cache-paths.json과 같은 목록을 쓴다", () => {
		expect([...EDGE_CACHE_PATHS].sort()).toEqual([...manifest.paths].sort());
		expect([...SUPPORTED_LANGUAGES].sort()).toEqual(
			[...manifest.languages].sort(),
		);
	});

	it("언어 접두사가 붙은 대상 경로만 맞다고 본다", () => {
		expect(isEdgeCachePath("/ko/introduce")).toBe(true);
		expect(isEdgeCachePath("/en/use-cases/learning")).toBe(true);
		expect(isEdgeCachePath("/introduce")).toBe(false);
		expect(isEdgeCachePath("/ko/memos")).toBe(false);
		expect(isEdgeCachePath("/ko/introduce/x")).toBe(false);
	});
});
