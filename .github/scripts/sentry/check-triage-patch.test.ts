import { describe, expect, it } from "vitest";
import {
	evaluatePatch,
	findForbiddenReason,
	parseNumstatZ,
	parseRawZ,
} from "./check-triage-patch.mjs";

const file = (path: string, added = 1, deleted = 0, mode = "100644") => ({
	path,
	added,
	deleted,
	mode,
});

describe("findForbiddenReason", () => {
	it.each([
		".github/workflows/ci.yml",
		"packages/supabase-edge-functions/a.ts",
		"supabase/config.toml",
		"apps/web/supabase/migrations/001.sql",
		"apps/web/src/modules/auth/session.ts",
		"apps/web/src/payment/x.ts",
		"apps/web/src/billing.ts",
		"apps/chrome-extension/manifest.js",
		"package.json",
		"apps/web/package.json",
		"pnpm-lock.yaml",
		".env.local",
		"apps/web/.env.production",
		"packages/env/src/config.ts",
		"AGENTS.md",
	])("%s 는 금지", (path) => {
		expect(findForbiddenReason(path)).not.toBeNull();
	});

	it("일반 소스는 허용", () => {
		expect(findForbiddenReason("packages/shared/src/utils/url.ts")).toBeNull();
		expect(findForbiddenReason("apps/web/src/a.test.ts")).toBeNull();
	});
});

describe("evaluatePatch", () => {
	it("변경이 없으면 none", () => {
		expect(evaluatePatch({ files: [] }).status).toBe("none");
	});

	it("범위 안이면 ready", () => {
		const result = evaluatePatch({ files: [file("a/b.ts", 5, 2), file("a/b.test.ts", 30)] });
		expect(result).toMatchObject({ status: "ready", changedLines: 37 });
	});

	it("금지 경로가 하나라도 있으면 rejected", () => {
		const result = evaluatePatch({ files: [file("a.ts"), file(".github/x.yml")] });
		expect(result.status).toBe("rejected");
		expect(result.reasons[0]).toContain(".github/x.yml");
	});

	it("파일 6개는 거부, 5개는 통과", () => {
		const many = (n: number) => Array.from({ length: n }, (_, i) => file(`src/f${i}.ts`));
		expect(evaluatePatch({ files: many(5) }).status).toBe("ready");
		expect(evaluatePatch({ files: many(6) }).status).toBe("rejected");
	});

	it("200줄 초과는 거부", () => {
		expect(evaluatePatch({ files: [file("a.ts", 150, 50)] }).status).toBe("ready");
		expect(evaluatePatch({ files: [file("a.ts", 150, 51)] }).status).toBe("rejected");
	});

	it("바이너리·심볼릭 링크는 거부", () => {
		const binary = { path: "a.png", added: null, deleted: null, mode: "100644" };
		expect(evaluatePatch({ files: [binary] }).status).toBe("rejected");
		expect(evaluatePatch({ files: [file("a.ts", 1, 0, "120000")] }).status).toBe("rejected");
	});
});

describe("git 출력 파서", () => {
	it("numstat -z", () => {
		expect(parseNumstatZ("3\t1\ta.ts\0-\t-\tb.png\0")).toEqual([
			{ path: "a.ts", added: 3, deleted: 1 },
			{ path: "b.png", added: null, deleted: null },
		]);
	});

	it("raw -z 는 새 모드를, 삭제는 옛 모드를 읽는다", () => {
		const raw = ":100644 120000 aaa bbb M\0a.ts\0:100755 000000 aaa 000 D\0b.sh\0";
		expect(parseRawZ(raw)).toEqual([
			{ path: "a.ts", mode: "120000" },
			{ path: "b.sh", mode: "100755" },
		]);
	});
});
